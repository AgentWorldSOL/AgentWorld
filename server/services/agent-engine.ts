import type { Agent, Task } from "@shared/schema";
import { createLogger } from "../utils/logger";
import { generateAgentSeed } from "../utils/crypto";

const logger = createLogger("agent-engine");

interface AgentCapabilityProfile {
  agentId: string;
  strengths: string[];
  weaknesses: string[];
  overallScore: number;
  recentTrend: "improving" | "stable" | "declining";
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: (agent: Agent, context: Record<string, unknown>) => boolean;
  action: string;
  enabled: boolean;
}

export class AgentEngine {
  private automationRules: AutomationRule[] = [];
  private performanceHistory: Map<string, number[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.automationRules = [
      {
        id: "auto-reassign-overdue",
        name: "Auto-reassign overdue tasks",
        trigger: "task_overdue",
        condition: (agent) => agent.status === "offline",
        action: "reassign_task",
        enabled: true,
      },
      {
        id: "performance-alert",
        name: "Performance degradation alert",
        trigger: "performance_check",
        condition: (agent) => (agent.performanceScore ?? 100) < 50,
        action: "send_alert",
        enabled: true,
      },
      {
        id: "workload-balance",
        name: "Automatic workload balancing",
        trigger: "task_assigned",
        condition: (_agent, context) =>
          (context.currentLoad as number) >
          (context.maxCapacity as number) * 0.9,
        action: "redistribute_tasks",
        enabled: false,
      },
    ];
  }

  evaluatePerformance(
    agent: Agent,
    completedTasks: Task[],
    totalTasks: Task[],
  ): number {
    let score = 100;

    const assignedTasks = totalTasks.filter(
      (t) => t.assignedAgentId === agent.id,
    );
    const agentCompletedTasks = completedTasks.filter(
      (t) => t.assignedAgentId === agent.id,
    );

    if (assignedTasks.length > 0) {
      const completionRate =
        agentCompletedTasks.length / assignedTasks.length;
      score = Math.round(score * (0.3 + 0.7 * completionRate));
    }

    const overdueTasks = assignedTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== "completed",
    );
    score -= overdueTasks.length * 5;

    const criticalCompleted = agentCompletedTasks.filter(
      (t) => t.priority === "critical",
    ).length;
    score += criticalCompleted * 3;

    const history = this.performanceHistory.get(agent.id) || [];
    history.push(score);
    if (history.length > 30) history.shift();
    this.performanceHistory.set(agent.id, history);

    return Math.max(0, Math.min(100, score));
  }

  buildCapabilityProfile(
    agent: Agent,
    tasks: Task[],
  ): AgentCapabilityProfile {
    const agentTasks = tasks.filter(
      (t) => t.assignedAgentId === agent.id,
    );

    const categoryPerformance: Record<
      string,
      { completed: number; total: number }
    > = {};

    for (const task of agentTasks) {
      const cat = task.category || "general";
      if (!categoryPerformance[cat]) {
        categoryPerformance[cat] = { completed: 0, total: 0 };
      }
      categoryPerformance[cat].total++;
      if (task.status === "completed") {
        categoryPerformance[cat].completed++;
      }
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [category, perf] of Object.entries(categoryPerformance)) {
      const rate = perf.total > 0 ? perf.completed / perf.total : 0;
      if (rate >= 0.8 && perf.total >= 2) {
        strengths.push(category);
      } else if (rate < 0.5 && perf.total >= 2) {
        weaknesses.push(category);
      }
    }

    const history = this.performanceHistory.get(agent.id) || [];
    let trend: "improving" | "stable" | "declining" = "stable";
    if (history.length >= 5) {
      const recent = history.slice(-5);
      const older = history.slice(-10, -5);
      if (older.length > 0) {
        const recentAvg =
          recent.reduce((s, v) => s + v, 0) / recent.length;
        const olderAvg =
          older.reduce((s, v) => s + v, 0) / older.length;
        if (recentAvg > olderAvg + 5) trend = "improving";
        else if (recentAvg < olderAvg - 5) trend = "declining";
      }
    }

    return {
      agentId: agent.id,
      strengths,
      weaknesses,
      overallScore: agent.performanceScore ?? 100,
      recentTrend: trend,
    };
  }

  generateAgentAvatar(name: string): string {
    return generateAgentSeed();
  }

  getRecommendedRole(
    existingAgents: Agent[],
    organizationIndustry: string,
  ): string[] {
    const existingRoles = new Set(existingAgents.map((a) => a.role));
    const coreRoles = ["CEO", "CTO", "CFO", "CMO"];
    const missing = coreRoles.filter((r) => !existingRoles.has(r));

    if (missing.length > 0) return missing;

    const industryRoles: Record<string, string[]> = {
      Technology: [
        "Engineering Lead",
        "DevOps Engineer",
        "Frontend Developer",
        "Backend Developer",
      ],
      DeFi: [
        "Treasury Manager",
        "Risk Analyst",
        "Compliance Officer",
        "Data Analyst",
      ],
      NFT: ["UI/UX Designer", "Community Manager", "Content Strategist"],
      GameFi: [
        "Full Stack Developer",
        "UI/UX Designer",
        "Community Manager",
      ],
      DAO: [
        "Compliance Officer",
        "Community Manager",
        "Treasury Manager",
      ],
    };

    const suggested = industryRoles[organizationIndustry] || [];
    return suggested.filter((r) => !existingRoles.has(r)).slice(0, 3);
  }

  computeOrganizationHealth(
    agents: Agent[],
    tasks: Task[],
  ): {
    score: number;
    factors: { name: string; score: number; weight: number }[];
  } {
    const factors: { name: string; score: number; weight: number }[] = [];

    const activeRatio =
      agents.length > 0
        ? agents.filter((a) => a.status === "active").length /
          agents.length
        : 0;
    factors.push({
      name: "Agent Activity",
      score: activeRatio * 100,
      weight: 0.2,
    });

    const completedTasks = tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const totalTasks = tasks.length;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
    factors.push({
      name: "Task Completion",
      score: completionRate,
      weight: 0.3,
    });

    const avgPerformance =
      agents.length > 0
        ? agents.reduce(
            (sum, a) => sum + (a.performanceScore ?? 100),
            0,
          ) / agents.length
        : 100;
    factors.push({
      name: "Team Performance",
      score: avgPerformance,
      weight: 0.25,
    });

    const hasLeadership = agents.some((a) =>
      ["CEO", "CTO", "CFO", "CMO", "COO"].includes(a.role),
    );
    const structureScore = hasLeadership ? 100 : 40;
    factors.push({
      name: "Organization Structure",
      score: structureScore,
      weight: 0.15,
    });

    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== "completed" &&
        t.status !== "cancelled",
    ).length;
    const overdueRatio =
      totalTasks > 0 ? 1 - overdueTasks / totalTasks : 1;
    factors.push({
      name: "Deadline Adherence",
      score: overdueRatio * 100,
      weight: 0.1,
    });

    const overallScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0,
    );

    return { score: Math.round(overallScore), factors };
  }

  getAutomationRules(): AutomationRule[] {
    return this.automationRules;
  }

  toggleAutomationRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.automationRules.find((r) => r.id === ruleId);
    if (!rule) return false;
    rule.enabled = enabled;
    logger.info("Automation rule toggled", { ruleId, enabled });
    return true;
  }
}

export const agentEngine = new AgentEngine();
