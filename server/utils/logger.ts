type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const RESET = "\x1b[0m";

class Logger {
  private source: string;
  private minLevel: LogLevel;

  constructor(source: string, minLevel: LogLevel = "info") {
    this.source = source;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatEntry(entry: LogEntry): string {
    const color = LOG_COLORS[entry.level];
    const levelTag = entry.level.toUpperCase().padEnd(5);
    let line = `${color}[${entry.timestamp}] ${levelTag}${RESET} [${entry.source}] ${entry.message}`;
    if (entry.data) {
      line += ` ${JSON.stringify(entry.data)}`;
    }
    return line;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      source: this.source,
      message,
      data,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log("error", message, data);
  }

  child(childSource: string): Logger {
    return new Logger(`${this.source}:${childSource}`, this.minLevel);
  }
}

export function createLogger(source: string, minLevel?: LogLevel): Logger {
  return new Logger(source, minLevel);
}

export const appLogger = createLogger("agentworld");
export const apiLogger = createLogger("api");
export const wsLogger = createLogger("websocket");
export const taskLogger = createLogger("task-engine");
export const walletLogger = createLogger("wallet");
