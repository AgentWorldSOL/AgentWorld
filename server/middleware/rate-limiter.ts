import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_OPTIONS: RateLimiterOptions = {
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: "Too many requests, please try again later.",
};

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

setInterval(cleanupExpired, 60 * 1000);

export function rateLimiter(options: Partial<RateLimiterOptions> = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : req.ip || req.socket.remoteAddress || "unknown";

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + config.windowMs };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", config.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (entry.count > config.maxRequests) {
      res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: config.message,
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
}

export function apiRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    message: "API rate limit exceeded. Please wait before making more requests.",
  });
}

export function authRateLimiter() {
  return rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  });
}

export function walletRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: "Wallet operation rate limit exceeded. Please slow down.",
  });
}
