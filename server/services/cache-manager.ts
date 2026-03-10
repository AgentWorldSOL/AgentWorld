interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
  onEvict?: (key: string) => void;
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttlMs: 5 * 60 * 1000,
  maxEntries: 1000,
};

export class CacheManager<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private options: CacheOptions;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.totalMisses++;
      return null;
    }

    entry.hits++;
    this.totalHits++;
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    if (this.store.size >= this.options.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    this.store.set(key, {
      data,
      expiresAt: now + (ttlMs || this.options.ttlMs),
      createdAt: now,
      hits: 0,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = 0;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  clear(): void {
    this.store.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  size(): number {
    return this.store.size;
  }

  stats(): {
    entries: number;
    maxEntries: number;
    hits: number;
    misses: number;
    hitRate: number;
    memoryEstimateKB: number;
  } {
    const total = this.totalHits + this.totalMisses;
    return {
      entries: this.store.size,
      maxEntries: this.options.maxEntries,
      hits: this.totalHits,
      misses: this.totalMisses,
      hitRate: total > 0 ? Math.round((this.totalHits / total) * 100) : 0,
      memoryEstimateKB: Math.round((JSON.stringify([...this.store]).length / 1024) * 100) / 100,
    };
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.options.onEvict?.(oldestKey);
    }
  }
}

export const agentCache = new CacheManager({ ttlMs: 30 * 1000, maxEntries: 200 });
export const taskCache = new CacheManager({ ttlMs: 15 * 1000, maxEntries: 500 });
export const analyticsCache = new CacheManager({ ttlMs: 60 * 1000, maxEntries: 50 });
export const hierarchyCache = new CacheManager({ ttlMs: 45 * 1000, maxEntries: 50 });
