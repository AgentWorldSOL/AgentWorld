interface MetricPoint {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface MetricSummary {
  name: string;
  type: "counter" | "gauge" | "histogram";
  current: number;
  min: number;
  max: number;
  avg: number;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

class Metric {
  readonly name: string;
  readonly type: "counter" | "gauge" | "histogram";
  private points: MetricPoint[] = [];
  private maxPoints: number;

  constructor(name: string, type: "counter" | "gauge" | "histogram", maxPoints: number = 1000) {
    this.name = name;
    this.type = type;
    this.maxPoints = maxPoints;
  }

  record(value: number, labels?: Record<string, string>): void {
    this.points.push({ value, timestamp: Date.now(), labels });
    if (this.points.length > this.maxPoints) {
      this.points = this.points.slice(-this.maxPoints);
    }
  }

  increment(amount: number = 1): void {
    const current = this.points.length > 0 ? this.points[this.points.length - 1].value : 0;
    this.record(current + amount);
  }

  getSummary(windowMs?: number): MetricSummary {
    let filtered = this.points;

    if (windowMs) {
      const cutoff = Date.now() - windowMs;
      filtered = this.points.filter((p) => p.timestamp >= cutoff);
    }

    if (filtered.length === 0) {
      return {
        name: this.name, type: this.type,
        current: 0, min: 0, max: 0, avg: 0, count: 0,
        p50: 0, p95: 0, p99: 0,
      };
    }

    const values = filtered.map((p) => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      name: this.name,
      type: this.type,
      current: values[values.length - 1],
      min: values[0],
      max: values[values.length - 1],
      avg: Math.round((sum / values.length) * 100) / 100,
      count: values.length,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
    };
  }

  getTimeSeries(bucketMs: number = 60000, windowMs?: number): Array<{ timestamp: number; value: number }> {
    let filtered = this.points;

    if (windowMs) {
      const cutoff = Date.now() - windowMs;
      filtered = this.points.filter((p) => p.timestamp >= cutoff);
    }

    const buckets = new Map<number, number[]>();

    for (const point of filtered) {
      const bucket = Math.floor(point.timestamp / bucketMs) * bucketMs;
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push(point.value);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, values]) => ({
        timestamp,
        value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

class MetricCollector {
  private metrics = new Map<string, Metric>();

  counter(name: string): Metric {
    return this.getOrCreate(name, "counter");
  }

  gauge(name: string): Metric {
    return this.getOrCreate(name, "gauge");
  }

  histogram(name: string): Metric {
    return this.getOrCreate(name, "histogram");
  }

  getAllSummaries(windowMs?: number): MetricSummary[] {
    return Array.from(this.metrics.values()).map((m) => m.getSummary(windowMs));
  }

  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  reset(): void {
    this.metrics.clear();
  }

  private getOrCreate(name: string, type: "counter" | "gauge" | "histogram"): Metric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new Metric(name, type));
    }
    return this.metrics.get(name)!;
  }
}

export const metrics = new MetricCollector();

export const SystemMetrics = {
  HTTP_REQUESTS: "http.requests.total",
  HTTP_LATENCY: "http.latency.ms",
  HTTP_ERRORS: "http.errors.total",
  AGENT_COUNT: "agents.count",
  TASK_COUNT: "tasks.count",
  TASK_COMPLETION_TIME: "tasks.completion.ms",
  WS_CONNECTIONS: "websocket.connections",
  WS_MESSAGES: "websocket.messages.total",
  CACHE_HIT_RATE: "cache.hit_rate",
  QUEUE_DEPTH: "queue.depth",
  MEMORY_HEAP: "memory.heap.mb",
  EVENT_LOOP_LAG: "eventloop.lag.ms",
} as const;
