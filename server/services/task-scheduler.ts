import type { Task, Agent } from "@shared/schema";
import { getPriorityWeight } from "@shared/validators";
import { createLogger } from "../utils/logger";

const logger = createLogger("task-scheduler");

interface TaskAssignment {
  taskId: string;
  agentId: string;
  score: number;
  reasons: string[];
}

interface AgentWorkload {
  agentId: string;
  activeTasks: number;
  totalCapacity: number;
  utilizationRate: number;
}

export class TaskScheduler {
  private taskQueue: Task[] = [];
  private agentWorkloads: Map<string, AgentWorkload> = new Map();

  updateWorkloads(agents: Agent[], tasks: Task[]): void {
    this.agentWorkloads.clear();

    for (const agent of agents) {
      const activeTasks = tasks.filter(
        (t) =>
          t.assignedAgentId === agent.id &&
          (t.status === "in_progress" || t.status === "pending"),
      ).length;

      const capacity = this.computeCapacity(agent);

      this.agentWorkloads.set(agent.id, {
        agentId: agent.id,
        activeTasks,
        totalCapacity: capacity,
        utilizationRate: capacity > 0 ? activeTasks / capacity : 1,
      });
    }

    logger.info("Workloads updated", {
      agentCount: agents.length,
    });
  }

  private computeCapacity(agent: Agent): number {
    const baseCapacity = 5;
    const tierBonus = Math.max(0, 3 - (agent.tier ?? 0));
    const performanceBonus =
      ((agent.performanceScore ?? 100) / 100) * 2;

    return Math.round(baseCapacity + tierBonus + performanceBonus);
  }

  suggestAssignment(
    task: Task,
    candidates: Agent[],
  ): TaskAssignment | null {
    if (candidates.length === 0) return null;

    const scored = candidates.map((agent) => {
      const score = this.scoreAgentForTask(agent, task);
      return {
        taskId: task.id,
        agentId: agent.id,
        score: score.total,
        reasons: score.reasons,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  private scoreAgentForTask(
    agent: Agent,
    task: Task,
  ): { total: number; reasons: string[] } {
    let total = 0;
    const reasons: string[] = [];

    const workload = this.agentWorkloads.get(agent.id);
    if (workload) {
      const availabilityScore = (1 - workload.utilizationRate) * 30;
      total += availabilityScore;
      if (availabilityScore > 20) {
        reasons.push("High availability");
      }
    }

    const performanceScore =
      ((agent.performanceScore ?? 100) / 100) * 25;
    total += performanceScore;
    if (performanceScore > 20) {
      reasons.push("Strong performance history");
    }

    if (task.category && agent.capabilities) {
      const categoryMatch = agent.capabilities.some(
        (cap) =>
          cap &&
          task.category &&
          cap.toLowerCase().includes(task.category.toLowerCase()),
      );
      if (categoryMatch) {
        total += 25;
        reasons.push("Capability match");
      }
    }

    const roleScore = this.computeRoleRelevance(
      agent.role,
      task.category || "",
    );
    total += roleScore;
    if (roleScore > 10) {
      reasons.push("Role alignment");
    }

    if (agent.status === "active") {
      total += 10;
      reasons.push("Currently active");
    } else if (agent.status === "idle") {
      total += 5;
    }

    return { total, reasons };
  }

  private computeRoleRelevance(role: string, category: string): number {
    const roleMapping: Record<string, string[]> = {
      development: [
        "CTO",
        "Engineering Lead",
        "Frontend Developer",
        "Backend Developer",
        "Full Stack Developer",
        "DevOps Engineer",
      ],
      marketing: [
        "CMO",
        "Marketing Lead",
        "Content Strategist",
        "Growth Hacker",
        "Community Manager",
      ],
      sales: ["VP Sales", "Sales Lead"],
      finance: ["CFO", "Treasury Manager", "Risk Analyst"],
      design: ["UI/UX Designer"],
      operations: ["COO", "VP Operations"],
      strategy: ["CEO", "Product Manager"],
      compliance: ["Compliance Officer"],
      research: ["Data Analyst"],
    };

    const relevantRoles = roleMapping[category.toLowerCase()] || [];
    if (relevantRoles.includes(role)) return 20;

    return 0;
  }

  prioritizeTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const priorityDiff =
        getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;

      if (a.dueDate && b.dueDate) {
        return (
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return (
        new Date(a.createdAt!).getTime() -
        new Date(b.createdAt!).getTime()
      );
    });
  }

  getWorkloadSummary(): {
    overloaded: string[];
    underutilized: string[];
    balanced: string[];
  } {
    const overloaded: string[] = [];
    const underutilized: string[] = [];
    const balanced: string[] = [];

    for (const [agentId, workload] of this.agentWorkloads) {
      if (workload.utilizationRate > 0.8) {
        overloaded.push(agentId);
      } else if (workload.utilizationRate < 0.3) {
        underutilized.push(agentId);
      } else {
        balanced.push(agentId);
      }
    }

    return { overloaded, underutilized, balanced };
  }

  detectBottlenecks(
    tasks: Task[],
    agents: Agent[],
  ): {
    blockedTasks: Task[];
    overloadedAgents: Agent[];
    unassignedHighPriority: Task[];
  } {
    const blockedTasks = tasks.filter(
      (t) =>
        t.status === "pending" &&
        t.dependencies &&
        t.dependencies.length > 0 &&
        t.dependencies.some((depId) => {
          const dep = tasks.find((dt) => dt.id === depId);
          return dep && dep.status !== "completed";
        }),
    );

    const overloadedAgents = agents.filter((a) => {
      const workload = this.agentWorkloads.get(a.id);
      return workload && workload.utilizationRate > 0.9;
    });

    const unassignedHighPriority = tasks.filter(
      (t) =>
        !t.assignedAgentId &&
        (t.priority === "high" || t.priority === "critical") &&
        t.status === "pending",
    );

    return { blockedTasks, overloadedAgents, unassignedHighPriority };
  }
}

export const taskScheduler = new TaskScheduler();
