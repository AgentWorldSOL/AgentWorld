interface TokenBucketOptions {
  capacity: number;
  refillRate: number;
  refillIntervalMs: number;
  initialTokens?: number;
}

interface ConsumptionResult {
  allowed: boolean;
  tokensRemaining: number;
  retryAfterMs: number;
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillIntervalMs: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.refillIntervalMs = options.refillIntervalMs;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervals = Math.floor(elapsed / this.refillIntervalMs);

    if (intervals > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + intervals * this.refillRate);
      this.lastRefill = now - (elapsed % this.refillIntervalMs);
    }
  }

  consume(tokens: number = 1): ConsumptionResult {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return {
        allowed: true,
        tokensRemaining: Math.floor(this.tokens),
        retryAfterMs: 0,
      };
    }

    const deficit = tokens - this.tokens;
    const intervalsNeeded = Math.ceil(deficit / this.refillRate);
    const retryAfterMs = intervalsNeeded * this.refillIntervalMs;

    return {
      allowed: false,
      tokensRemaining: Math.floor(this.tokens),
      retryAfterMs,
    };
  }

  peek(): { tokens: number; capacity: number; refillsAt: number } {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillsAt: this.lastRefill + this.refillIntervalMs,
    };
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

class TokenBucketRegistry {
  private buckets = new Map<string, TokenBucket>();
  private defaultOptions: TokenBucketOptions;

  constructor(defaultOptions: TokenBucketOptions) {
    this.defaultOptions = defaultOptions;
  }

  getBucket(key: string, options?: TokenBucketOptions): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new TokenBucket(options || this.defaultOptions));
    }
    return this.buckets.get(key)!;
  }

  consume(key: string, tokens: number = 1): ConsumptionResult {
    return this.getBucket(key).consume(tokens);
  }

  reset(key: string): void {
    this.buckets.get(key)?.reset();
  }

  delete(key: string): void {
    this.buckets.delete(key);
  }

  size(): number {
    return this.buckets.size;
  }
}

export const apiLimiter = new TokenBucketRegistry({
  capacity: 100,
  refillRate: 10,
  refillIntervalMs: 1000,
});

export const walletLimiter = new TokenBucketRegistry({
  capacity: 10,
  refillRate: 1,
  refillIntervalMs: 6000,
});

export const searchLimiter = new TokenBucketRegistry({
  capacity: 30,
  refillRate: 5,
  refillIntervalMs: 1000,
});

export { TokenBucket, TokenBucketRegistry };
