import type { Agent } from "../../shared/schema";

export type AgentStatus = "idle" | "active" | "busy" | "offline" | "error";

interface StatusTransition {
  from: AgentStatus;
  to: AgentStatus;
  condition?: string;
}

const VALID_TRANSITIONS: StatusTransition[] = [
  { from: "idle", to: "active", condition: "Agent assigned to task" },
  { from: "idle", to: "offline", condition: "Agent manually deactivated" },
  { from: "active", to: "busy", condition: "Agent processing high-priority task" },
  { from: "active", to: "idle", condition: "Task completed, no pending work" },
  { from: "active", to: "error", condition: "Agent encountered runtime error" },
  { from: "active", to: "offline", condition: "Agent manually deactivated" },
  { from: "busy", to: "active", condition: "High-priority task completed" },
  { from: "busy", to: "error", condition: "Agent encountered critical failure" },
  { from: "busy", to: "idle", condition: "All tasks completed" },
  { from: "error", to: "idle", condition: "Error resolved, agent reset" },
  { from: "error", to: "offline", condition: "Agent deactivated after error" },
  { from: "offline", to: "idle", condition: "Agent reactivated" },
];

export function canTransition(from: AgentStatus, to: AgentStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getTransitionReason(
  from: AgentStatus,
  to: AgentStatus
): string | null {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === from && t.to === to
  );
  return transition?.condition || null;
}

export function getAvailableTransitions(current: AgentStatus): AgentStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === current)
    .map((t) => t.to);
}

export function validateStatusTransition(
  agent: Agent,
  newStatus: AgentStatus
): { valid: boolean; reason: string } {
  const currentStatus = (agent.status || "idle") as AgentStatus;

  if (currentStatus === newStatus) {
    return { valid: true, reason: "No status change required" };
  }

  if (!canTransition(currentStatus, newStatus)) {
    const available = getAvailableTransitions(currentStatus);
    return {
      valid: false,
      reason: `Cannot transition from '${currentStatus}' to '${newStatus}'. Valid transitions: ${available.join(", ")}`,
    };
  }

  const transitionReason = getTransitionReason(currentStatus, newStatus);
  return {
    valid: true,
    reason: transitionReason || `Transition from '${currentStatus}' to '${newStatus}'`,
  };
}

export function computeAgentWorkload(
  activeTasks: number,
  maxCapacity: number = 5
): { level: "low" | "medium" | "high" | "overloaded"; percentage: number } {
  const percentage = Math.round((activeTasks / maxCapacity) * 100);

  if (percentage <= 25) return { level: "low", percentage };
  if (percentage <= 60) return { level: "medium", percentage };
  if (percentage <= 100) return { level: "high", percentage };
  return { level: "overloaded", percentage };
}

export function determineAutoStatus(
  activeTasks: number,
  hasCriticalTask: boolean
): AgentStatus {
  if (activeTasks === 0) return "idle";
  if (hasCriticalTask || activeTasks > 3) return "busy";
  return "active";
}
