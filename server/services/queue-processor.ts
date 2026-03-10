interface QueueItem<T> {
  id: string;
  data: T;
  priority: number;
  addedAt: number;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
}

interface QueueOptions {
  maxRetries: number;
  retryDelayMs: number;
  concurrency: number;
  processTimeoutMs: number;
}

type ProcessorFn<T> = (item: T) => Promise<void>;

const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  maxRetries: 3,
  retryDelayMs: 1000,
  concurrency: 5,
  processTimeoutMs: 30000,
};

export class QueueProcessor<T> {
  private items: QueueItem<T>[] = [];
  private processing = new Set<string>();
  private processor: ProcessorFn<T> | null = null;
  private options: QueueOptions;
  private isRunning = false;
  private counter = 0;
  private processedCount = 0;
  private failedCount = 0;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = { ...DEFAULT_QUEUE_OPTIONS, ...options };
  }

  enqueue(data: T, priority: number = 0): string {
    const id = `job_${++this.counter}_${Date.now().toString(36)}`;

    const item: QueueItem<T> = {
      id,
      data,
      priority,
      addedAt: Date.now(),
      attempts: 0,
      maxAttempts: this.options.maxRetries + 1,
      status: "pending",
    };

    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority);

    if (this.isRunning) {
      this.processNext();
    }

    return id;
  }

  registerProcessor(fn: ProcessorFn<T>): void {
    this.processor = fn;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processNext();
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processNext(): Promise<void> {
    if (!this.isRunning || !this.processor) return;
    if (this.processing.size >= this.options.concurrency) return;

    const next = this.items.find(
      (item) => item.status === "pending" && !this.processing.has(item.id)
    );

    if (!next) return;

    this.processing.add(next.id);
    next.status = "processing";
    next.attempts++;

    try {
      await Promise.race([
        this.processor(next.data),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Process timeout")), this.options.processTimeoutMs)
        ),
      ]);

      next.status = "completed";
      this.processedCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      next.lastError = errorMsg;

      if (next.attempts >= next.maxAttempts) {
        next.status = "dead";
        this.failedCount++;
        console.error(`[Queue] Job ${next.id} permanently failed: ${errorMsg}`);
      } else {
        next.status = "pending";
        const delay = this.options.retryDelayMs * Math.pow(2, next.attempts - 1);
        setTimeout(() => this.processNext(), delay);
        console.warn(`[Queue] Job ${next.id} retry ${next.attempts}/${next.maxAttempts} in ${delay}ms`);
      }
    } finally {
      this.processing.delete(next.id);
    }

    this.processNext();
  }

  getStatus(jobId: string): QueueItem<T> | undefined {
    return this.items.find((item) => item.id === jobId);
  }

  getPendingCount(): number {
    return this.items.filter((i) => i.status === "pending").length;
  }

  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    dead: number;
    totalProcessed: number;
    totalFailed: number;
  } {
    return {
      pending: this.items.filter((i) => i.status === "pending").length,
      processing: this.processing.size,
      completed: this.items.filter((i) => i.status === "completed").length,
      failed: this.items.filter((i) => i.status === "failed").length,
      dead: this.items.filter((i) => i.status === "dead").length,
      totalProcessed: this.processedCount,
      totalFailed: this.failedCount,
    };
  }

  purgeCompleted(): number {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.status !== "completed");
    return before - this.items.length;
  }
}

export const taskQueue = new QueueProcessor({ concurrency: 3, maxRetries: 2 });
export const notificationQueue = new QueueProcessor({ concurrency: 10, maxRetries: 1 });
export const walletQueue = new QueueProcessor({ concurrency: 1, maxRetries: 3, retryDelayMs: 2000 });
