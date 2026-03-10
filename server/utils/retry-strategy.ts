interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

function calculateDelay(attempt: number, options: RetryOptions): number {
  let delay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  delay = Math.min(delay, options.maxDelayMs);

  if (options.jitter) {
    const jitterRange = delay * 0.3;
    delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
  }

  return Math.round(delay);
}

function isRetryable(error: Error, retryableErrors?: string[]): boolean {
  if (!retryableErrors || retryableErrors.length === 0) return true;

  const errorMsg = error.message.toLowerCase();
  return retryableErrors.some((pattern) => errorMsg.includes(pattern.toLowerCase()));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) break;

      if (!isRetryable(lastError, config.retryableErrors)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);
      config.onRetry?.(attempt, lastError, delay);

      await sleep(delay);
    }
  }

  throw lastError;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  state: CircuitBreakerState,
  options: { threshold: number; resetTimeMs: number } = { threshold: 5, resetTimeMs: 60000 }
): Promise<T> {
  if (state.status === "open") {
    if (Date.now() - state.lastFailure < options.resetTimeMs) {
      throw new Error("Circuit breaker is open - service unavailable");
    }
    state.status = "half-open";
  }

  try {
    const result = await fn();
    if (state.status === "half-open") {
      state.status = "closed";
      state.failures = 0;
    }
    return result;
  } catch (error) {
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= options.threshold) {
      state.status = "open";
    }

    throw error;
  }
}

export interface CircuitBreakerState {
  status: "closed" | "open" | "half-open";
  failures: number;
  lastFailure: number;
}

export function createCircuitBreaker(): CircuitBreakerState {
  return { status: "closed", failures: 0, lastFailure: 0 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const solanaRpcBreaker = createCircuitBreaker();
export const storageBreaker = createCircuitBreaker();
