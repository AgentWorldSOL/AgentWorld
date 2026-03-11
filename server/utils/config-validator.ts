import { z } from "zod";

const ServerConfigSchema = z.object({
  port: z.coerce.number().min(1024).max(65535).default(5000),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  sessionSecret: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  databaseUrl: z.string().url().optional(),
  solanaRpcUrl: z
    .string()
    .url()
    .default("https://api.mainnet-beta.solana.com"),
  corsOrigins: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim()))
    .default("http://localhost:5000"),
  logLevel: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),
  wsHeartbeatIntervalMs: z.coerce.number().default(30000),
  cacheDefaultTtlMs: z.coerce.number().default(300000),
  maxUploadSizeMb: z.coerce.number().max(100).default(10),
});

type ServerConfig = z.infer<typeof ServerConfigSchema>;

function loadConfigFromEnv(): Record<string, string | undefined> {
  return {
    port: process.env.PORT,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
    sessionSecret: process.env.SESSION_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    solanaRpcUrl: process.env.SOLANA_RPC_URL,
    corsOrigins: process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS,
    logLevel: process.env.LOG_LEVEL,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    wsHeartbeatIntervalMs: process.env.WS_HEARTBEAT_INTERVAL_MS,
    cacheDefaultTtlMs: process.env.CACHE_DEFAULT_TTL_MS,
    maxUploadSizeMb: process.env.MAX_UPLOAD_SIZE_MB,
  };
}

function validateConfig(raw: Record<string, string | undefined>): {
  config: ServerConfig | null;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const result = ServerConfigSchema.safeParse(raw);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.join(".");
      errors.push(`${field}: ${issue.message}`);
    }
    return { config: null, errors, warnings };
  }

  const config = result.data;

  if (config.nodeEnv === "production") {
    if (!raw.databaseUrl) {
      warnings.push("DATABASE_URL not set - using in-memory storage (data will not persist)");
    }
    if (!raw.corsOrigins) {
      warnings.push("CORS_ORIGINS not set - defaulting to localhost only");
    }
    if (config.sessionSecret.length < 64) {
      warnings.push("SESSION_SECRET should be at least 64 characters in production");
    }
  }

  return { config, errors, warnings };
}

let cachedConfig: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (cachedConfig) return cachedConfig;

  const raw = loadConfigFromEnv();
  const { config, errors, warnings } = validateConfig(raw);

  for (const warning of warnings) {
    console.warn(`[Config] WARNING: ${warning}`);
  }

  if (errors.length > 0) {
    console.error("[Config] Configuration errors:");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  cachedConfig = config!;
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export type { ServerConfig };
