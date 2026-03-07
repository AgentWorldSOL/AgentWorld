import type { Agent, Task, Transaction, AgentMessage } from "@shared/schema";
import type { AgentAnalytics, DashboardMetrics, ActivityItem } from "@shared/validators";
import { createLogger } from "../utils/logger";

const logger = createLogger("analytics");

export class AnalyticsService {
  computeAgentAnalytics(
    agents: Agent[],
    tasks: Task[],
    transactions: Transaction[],
  ): AgentAnalytics {
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.status === "active").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const pendingTasks = tasks.filter(
      (t) => t.status === "pending",
    ).length;

    const totalTransactions = transactions.length;
    const totalSpent = transactions
      .filter((t) => t.status === "completed" || t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    const averagePerformance =
      totalAgents > 0
        ? agents.reduce(
            (sum, a) => sum + (a.performanceScore ?? 100),
            0,
          ) / totalAgents
        : 0;

    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const roleDistribution: Record<string, number> = {};
    for (const agent of agents) {
      roleDistribution[agent.role] =
        (roleDistribution[agent.role] || 0) + 1;
    }

    const statusDistribution: Record<string, number> = {};
    for (const agent of agents) {
      statusDistribution[agent.status] =
        (statusDistribution[agent.status] || 0) + 1;
    }

    const weeklyActivity = this.computeWeeklyActivity(tasks);

    return {
      totalAgents,
      activeAgents,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalTransactions,
      totalSpent,
      averagePerformance: Math.round(averagePerformance * 10) / 10,
      taskCompletionRate: Math.round(taskCompletionRate * 10) / 10,
      roleDistribution,
      statusDistribution,
      weeklyActivity,
    };
  }

  computeDashboardMetrics(
    agents: Agent[],
    tasks: Task[],
    transactions: Transaction[],
    messages: AgentMessage[],
  ): DashboardMetrics {
    const agentCount = agents.length;
    const taskCount = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const completionRate =
      taskCount > 0 ? (completedTasks / taskCount) * 100 : 0;

    const treasuryBalance = transactions
      .filter((t) => t.type === "treasury_deposit")
      .reduce((sum, t) => sum + t.amount, 0) -
      transactions
        .filter((t) => t.type === "treasury_withdrawal")
        .reduce((sum, t) => sum + t.amount, 0);

    const recentActivity = this.buildRecentActivity(
      agents,
      tasks,
      transactions,
      messages,
    );

    const performanceTrend = this.computePerformanceTrend(agents, tasks);

    return {
      agentCount,
      taskCount,
      completionRate: Math.round(completionRate * 10) / 10,
      treasuryBalance: Math.round(treasuryBalance * 100) / 100,
      recentActivity,
      performanceTrend,
    };
  }

  private buildRecentActivity(
    agents: Agent[],
    tasks: Task[],
    transactions: Transaction[],
    messages: AgentMessage[],
  ): ActivityItem[] {
    const activities: ActivityItem[] = [];

    const agentMap = new Map(agents.map((a) => [a.id, a]));

    for (const task of tasks.slice(-10)) {
      const assignedAgent = task.assignedAgentId
        ? agentMap.get(task.assignedAgentId)
        : null;
      activities.push({
        id: task.id,
        type: "task",
        title: task.title,
        description: `Task ${task.status}: ${task.title}`,
        timestamp: task.createdAt!,
        agentName: assignedAgent?.name,
        agentRole: assignedAgent?.role,
      });
    }

    for (const tx of transactions.slice(-5)) {
      const fromAgent = tx.fromAgentId
        ? agentMap.get(tx.fromAgentId)
        : null;
      activities.push({
        id: tx.id,
        type: "transaction",
        title: `${tx.type} - ${tx.amount} SOL`,
        description: tx.description || `Transaction: ${tx.type}`,
        timestamp: tx.createdAt!,
        agentName: fromAgent?.name,
        agentRole: fromAgent?.role,
      });
    }

    for (const msg of messages.slice(-5)) {
      const fromAgent = agentMap.get(msg.fromAgentId);
      activities.push({
        id: msg.id,
        type: "message",
        title: `Message from ${fromAgent?.name || "Unknown"}`,
        description:
          msg.content.length > 80
            ? msg.content.slice(0, 80) + "..."
            : msg.content,
        timestamp: msg.createdAt!,
        agentName: fromAgent?.name,
        agentRole: fromAgent?.role,
      });
    }

    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return activities.slice(0, 20);
  }

  private computeWeeklyActivity(
    tasks: Task[],
  ): { day: string; tasks: number; messages: number }[] {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activity = days.map((day) => ({
      day,
      tasks: 0,
      messages: 0,
    }));

    for (const task of tasks) {
      if (task.createdAt && new Date(task.createdAt) >= weekAgo) {
        const dayIndex = new Date(task.createdAt).getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        if (activity[adjustedIndex]) {
          activity[adjustedIndex].tasks++;
        }
      }
    }

    return activity;
  }

  private computePerformanceTrend(
    agents: Agent[],
    tasks: Task[],
  ): { date: string; score: number }[] {
    const trend: { date: string; score: number }[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      const tasksBeforeDate = tasks.filter(
        (t) => t.createdAt && new Date(t.createdAt) <= date,
      );
      const completedBeforeDate = tasksBeforeDate.filter(
        (t) => t.status === "completed",
      ).length;
      const totalBeforeDate = tasksBeforeDate.length;

      const score =
        totalBeforeDate > 0
          ? Math.round((completedBeforeDate / totalBeforeDate) * 100)
          : 100;

      trend.push({ date: dateStr, score });
    }

    return trend;
  }

  generateAgentReport(
    agent: Agent,
    tasks: Task[],
    transactions: Transaction[],
  ): {
    summary: string;
    metrics: Record<string, number>;
    recommendations: string[];
  } {
    const agentTasks = tasks.filter(
      (t) => t.assignedAgentId === agent.id,
    );
    const completedTasks = agentTasks.filter(
      (t) => t.status === "completed",
    );
    const agentTransactions = transactions.filter(
      (t) => t.toAgentId === agent.id || t.fromAgentId === agent.id,
    );

    const totalEarned = agentTransactions
      .filter((t) => t.toAgentId === agent.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const metrics: Record<string, number> = {
      totalTasks: agentTasks.length,
      completedTasks: completedTasks.length,
      completionRate:
        agentTasks.length > 0
          ? Math.round(
              (completedTasks.length / agentTasks.length) * 100,
            )
          : 0,
      totalEarned: Math.round(totalEarned * 100) / 100,
      performanceScore: agent.performanceScore ?? 100,
    };

    const recommendations: string[] = [];

    if (metrics.completionRate < 60) {
      recommendations.push(
        "Task completion rate is below target. Consider reducing workload or providing additional support.",
      );
    }

    if (agentTasks.length === 0) {
      recommendations.push(
        "No tasks assigned. Consider assigning tasks aligned with agent capabilities.",
      );
    }

    const overdueTasks = agentTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== "completed",
    );
    if (overdueTasks.length > 0) {
      recommendations.push(
        `${overdueTasks.length} overdue task(s) detected. Review deadlines and reassign if necessary.`,
      );
    }

    const summary = `Agent "${agent.name}" (${agent.role}) has completed ${completedTasks.length} of ${agentTasks.length} assigned tasks with a performance score of ${metrics.performanceScore}%.`;

    return { summary, metrics, recommendations };
  }
}

export const analyticsService = new AnalyticsService();
