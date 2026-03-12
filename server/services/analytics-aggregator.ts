import type { Agent, Task, Transaction } from "../../shared/schema";

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface AggregatedMetrics {
  agents: {
    total: number;
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
    avgPerformance: number;
    topPerformers: Array<{ id: number; name: string; performance: number }>;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    completionRate: number;
    avgCompletionTimeMs: number;
    overdueCount: number;
  };
  transactions: {
    total: number;
    totalVolumeRaw: number;
    byType: Record<string, number>;
    avgAmountRaw: number;
    recentCount: number;
  };
  timeSeries: {
    taskCompletions: TimeSeriesPoint[];
    agentActivity: TimeSeriesPoint[];
    transactionVolume: TimeSeriesPoint[];
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    result[k] = (result[k] || 0) + 1;
  }
  return result;
}

function buildTimeSeries(
  items: Array<{ date: Date; value: number }>,
  bucketMs: number = 24 * 60 * 60 * 1000,
  windowMs: number = 30 * 24 * 60 * 60 * 1000
): TimeSeriesPoint[] {
  const cutoff = Date.now() - windowMs;
  const buckets = new Map<number, number>();

  for (const item of items) {
    const ts = item.date.getTime();
    if (ts < cutoff) continue;
    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    buckets.set(bucket, (buckets.get(bucket) || 0) + item.value);
  }

  return Array.from(buckets.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function aggregateMetrics(
  agents: Agent[],
  tasks: Task[],
  transactions: Transaction[]
): AggregatedMetrics {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "completed") return false;
    return new Date(t.dueDate).getTime() < now;
  });

  const completionTimes = completedTasks
    .filter((t) => t.createdAt && t.updatedAt)
    .map((t) => new Date(t.updatedAt!).getTime() - new Date(t.createdAt!).getTime())
    .filter((ms) => ms > 0);

  const avgCompletionTimeMs =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  const sortedByPerf = [...agents]
    .sort((a, b) => (b.performance || 0) - (a.performance || 0))
    .slice(0, 5)
    .map((a) => ({ id: a.id, name: a.name, performance: a.performance || 0 }));

  const totalVolume = transactions.reduce((sum, tx) => {
    const amt = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
    return sum + amt;
  }, 0);

  const recentTxns = transactions.filter((tx) =>
    tx.createdAt && new Date(tx.createdAt).getTime() > last24h
  );

  const taskCompletionSeries = buildTimeSeries(
    completedTasks
      .filter((t) => t.updatedAt)
      .map((t) => ({ date: new Date(t.updatedAt!), value: 1 }))
  );

  const agentActivitySeries = buildTimeSeries(
    agents
      .filter((a) => a.createdAt)
      .map((a) => ({ date: new Date(a.createdAt!), value: 1 }))
  );

  const txVolumeSeries = buildTimeSeries(
    transactions
      .filter((tx) => tx.createdAt)
      .map((tx) => ({
        date: new Date(tx.createdAt!),
        value: typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0),
      }))
  );

  return {
    agents: {
      total: agents.length,
      byStatus: groupBy(agents, (a) => a.status || "idle"),
      byRole: groupBy(agents, (a) => a.role || "member"),
      avgPerformance:
        agents.length > 0
          ? Math.round(agents.reduce((s, a) => s + (a.performance || 0), 0) / agents.length)
          : 0,
      topPerformers: sortedByPerf,
    },
    tasks: {
      total: tasks.length,
      byStatus: groupBy(tasks, (t) => t.status || "pending"),
      byPriority: groupBy(tasks, (t) => t.priority || "medium"),
      completionRate:
        tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      avgCompletionTimeMs: Math.round(avgCompletionTimeMs),
      overdueCount: overdueTasks.length,
    },
    transactions: {
      total: transactions.length,
      totalVolumeRaw: Math.round(totalVolume),
      byType: groupBy(transactions, (tx) => tx.type || "transfer"),
      avgAmountRaw: transactions.length > 0 ? Math.round(totalVolume / transactions.length) : 0,
      recentCount: recentTxns.length,
    },
    timeSeries: {
      taskCompletions: taskCompletionSeries,
      agentActivity: agentActivitySeries,
      transactionVolume: txVolumeSeries,
    },
  };
}

export function computeGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeMovingAverage(series: TimeSeriesPoint[], windowSize: number): TimeSeriesPoint[] {
  return series.map((point, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = series.slice(start, i + 1);
    const avg = window.reduce((s, p) => s + p.value, 0) / window.length;
    return { ...point, value: Math.round(avg * 100) / 100 };
  });
}
