import type { Request, Response, Router } from "express";
import { storage } from "../storage";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, ComponentHealth>;
}

interface ComponentHealth {
  status: "pass" | "warn" | "fail";
  responseTime?: number;
  message?: string;
  lastChecked: string;
}

const startTime = Date.now();

async function checkStorage(): Promise<ComponentHealth> {
  const start = performance.now();

  try {
    await storage.getOrganizations();
    const responseTime = Math.round(performance.now() - start);

    return {
      status: responseTime > 500 ? "warn" : "pass",
      responseTime,
      message: responseTime > 500 ? "Slow response time" : "Storage operational",
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "fail",
      responseTime: Math.round(performance.now() - start),
      message: error instanceof Error ? error.message : "Storage check failed",
      lastChecked: new Date().toISOString(),
    };
  }
}

function checkMemory(): ComponentHealth {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const heapPercentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

  let status: "pass" | "warn" | "fail" = "pass";
  if (heapPercentage > 90) status = "fail";
  else if (heapPercentage > 75) status = "warn";

  return {
    status,
    message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`,
    lastChecked: new Date().toISOString(),
  };
}

function checkEventLoop(): ComponentHealth {
  const start = process.hrtime.bigint();
  const lagMs = Number(process.hrtime.bigint() - start) / 1e6;

  return {
    status: lagMs > 100 ? "warn" : "pass",
    responseTime: Math.round(lagMs * 100) / 100,
    message: `Event loop lag: ${lagMs.toFixed(2)}ms`,
    lastChecked: new Date().toISOString(),
  };
}

async function getHealthStatus(): Promise<HealthStatus> {
  const checks: Record<string, ComponentHealth> = {};

  checks.storage = await checkStorage();
  checks.memory = checkMemory();
  checks.eventLoop = checkEventLoop();

  const hasFailure = Object.values(checks).some((c) => c.status === "fail");
  const hasWarning = Object.values(checks).some((c) => c.status === "warn");

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (hasFailure) overallStatus = "unhealthy";
  else if (hasWarning) overallStatus = "degraded";

  return {
    status: overallStatus,
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  };
}

export function registerHealthRoutes(router: Router): void {
  router.get("/health", async (_req: Request, res: Response) => {
    const health = await getHealthStatus();
    const statusCode = health.status === "unhealthy" ? 503 : 200;
    res.status(statusCode).json(health);
  });

  router.get("/health/ready", async (_req: Request, res: Response) => {
    try {
      await storage.getOrganizations();
      res.status(200).json({ ready: true });
    } catch {
      res.status(503).json({ ready: false });
    }
  });

  router.get("/health/live", (_req: Request, res: Response) => {
    res.status(200).json({ alive: true, uptime: Math.round((Date.now() - startTime) / 1000) });
  });
}
