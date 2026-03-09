import type { Request, Response, NextFunction } from "express";

interface CorsOptions {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

const DEFAULT_CORS: CorsOptions = {
  origins: ["http://localhost:5000", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID",
    "X-API-Key",
    "Accept",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "X-Request-ID",
  ],
  credentials: true,
  maxAge: 86400,
};

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes("*")) return true;

  for (const allowed of allowedOrigins) {
    if (allowed === origin) return true;

    if (allowed.includes("*")) {
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      if (new RegExp(`^${pattern}$`).test(origin)) return true;
    }
  }

  return false;
}

export function corsMiddleware(options: Partial<CorsOptions> = {}) {
  const config = { ...DEFAULT_CORS, ...options };

  if (process.env.NODE_ENV === "production" && process.env.ALLOWED_ORIGINS) {
    config.origins = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin, config.origins)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    if (config.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader(
      "Access-Control-Expose-Headers",
      config.exposedHeaders.join(", ")
    );

    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        config.methods.join(", ")
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        config.allowedHeaders.join(", ")
      );
      res.setHeader("Access-Control-Max-Age", String(config.maxAge));
      res.status(204).end();
      return;
    }

    next();
  };
}

export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.mainnet-beta.solana.com wss:"
    );
    next();
  };
}
