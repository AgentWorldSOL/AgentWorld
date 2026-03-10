import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

interface RequestContext {
  requestId: string;
  startTime: number;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
}

const contextStore = new Map<string, RequestContext>();

export function requestContextMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId =
      (req.headers["x-request-id"] as string) ||
      generateRequestId();

    const context: RequestContext = {
      requestId,
      startTime: performance.now(),
      ip: req.ip || req.socket.remoteAddress || "unknown",
      method: req.method,
      path: req.path,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    contextStore.set(requestId, context);

    res.setHeader("X-Request-ID", requestId);

    res.on("finish", () => {
      const duration = Math.round(performance.now() - context.startTime);

      if (shouldLog(req.path, res.statusCode)) {
        const logLevel = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
        console.log(
          `[${logLevel}] ${context.method} ${context.path} ${res.statusCode} ${duration}ms [${requestId}]`
        );
      }

      contextStore.delete(requestId);
    });

    (req as unknown as Record<string, unknown>).requestId = requestId;
    (req as unknown as Record<string, unknown>).context = context;

    next();
  };
}

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(6).toString("hex");
  return `req_${timestamp}_${random}`;
}

function shouldLog(path: string, statusCode: number): boolean {
  const skipPaths = ["/health", "/health/live", "/health/ready", "/favicon.ico"];
  if (skipPaths.includes(path) && statusCode < 400) return false;
  return true;
}

export function getRequestContext(requestId: string): RequestContext | undefined {
  return contextStore.get(requestId);
}

export function getActiveRequestCount(): number {
  return contextStore.size;
}

export function requestTimingMiddleware() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const end = process.hrtime.bigint();
      const durationNs = Number(end - start);
      const durationMs = (durationNs / 1e6).toFixed(2);
      res.setHeader("X-Response-Time", `${durationMs}ms`);
    });

    next();
  };
}
