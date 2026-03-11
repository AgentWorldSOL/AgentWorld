import type { Agent, Task } from "../../shared/schema";

interface AgentScore {
  agentId: number;
  overall: number;
  breakdown: {
    taskCompletion: number;
    responseTime: number;
    reliability: number;
    collaboration: number;
    efficiency: number;
  };
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  trend: "improving" | "stable" | "declining";
  badge: string | null;
}

interface ScoringWeights {
  taskCompletion: number;
  responseTime: number;
  reliability: number;
  collaboration: number;
  efficiency: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  taskCompletion: 0.35,
  responseTime: 0.20,
  reliability: 0.20,
  collaboration: 0.15,
  efficiency: 0.10,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function scoreToGrade(score: number): "S" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function getBadge(score: number, grade: string): string | null {
  if (grade === "S") return "Elite Performer";
  if (grade === "A" && score >= 90) return "Top Achiever";
  if (grade === "A") return "High Performer";
  if (grade === "B" && score >= 80) return "Rising Star";
  return null;
}

function computeTaskCompletionScore(agentId: number, tasks: Task[]): number {
  const agentTasks = tasks.filter((t) => t.assigneeId === agentId);
  if (agentTasks.length === 0) return 70;

  const completed = agentTasks.filter((t) => t.status === "completed").length;
  const completionRate = completed / agentTasks.length;

  const onTimeTasks = agentTasks.filter((t) => {
    if (t.status !== "completed" || !t.dueDate) return false;
    const due = new Date(t.dueDate).getTime();
    const updated = new Date(t.updatedAt || Date.now()).getTime();
    return updated <= due;
  }).length;

  const onTimeRate = completed > 0 ? onTimeTasks / completed : 0;

  return clamp(completionRate * 70 + onTimeRate * 30);
}

function computeReliabilityScore(agent: Agent): number {
  const baseScore = agent.status === "active" ? 85 : agent.status === "busy" ? 75 : 50;
  const performanceBoost = (agent.performance || 0) > 80 ? 10 : 0;
  return clamp(baseScore + performanceBoost);
}

function computeEfficiencyScore(agentId: number, tasks: Task[]): number {
  const agentTasks = tasks.filter((t) => t.assigneeId === agentId && t.status === "completed");
  if (agentTasks.length === 0) return 65;

  const highPriorityCompleted = agentTasks.filter(
    (t) => t.priority === "high" || t.priority === "critical"
  ).length;

  const priorityRate = agentTasks.length > 0 ? highPriorityCompleted / agentTasks.length : 0;
  return clamp(65 + priorityRate * 35);
}

function computeCollaborationScore(agentId: number, allAgents: Agent[]): number {
  const agent = allAgents.find((a) => a.id === agentId);
  if (!agent) return 60;

  const subordinates = allAgents.filter((a) => a.parentId === agentId).length;
  const hasManager = allAgents.some((a) => a.id === agent.parentId);

  let score = 60;
  if (hasManager) score += 15;
  if (subordinates > 0) score += Math.min(25, subordinates * 5);

  return clamp(score);
}

export function scoreAgent(
  agent: Agent,
  tasks: Task[],
  allAgents: Agent[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): AgentScore {
  const breakdown = {
    taskCompletion: computeTaskCompletionScore(agent.id, tasks),
    responseTime: clamp((agent.performance || 0) * 0.9 + 10),
    reliability: computeReliabilityScore(agent),
    collaboration: computeCollaborationScore(agent.id, allAgents),
    efficiency: computeEfficiencyScore(agent.id, tasks),
  };

  const overall = clamp(
    Math.round(
      breakdown.taskCompletion * weights.taskCompletion +
        breakdown.responseTime * weights.responseTime +
        breakdown.reliability * weights.reliability +
        breakdown.collaboration * weights.collaboration +
        breakdown.efficiency * weights.efficiency
    )
  );

  const grade = scoreToGrade(overall);
  const badge = getBadge(overall, grade);

  const prevScore = (agent.performance || 0);
  const trend =
    overall > prevScore + 5
      ? "improving"
      : overall < prevScore - 5
      ? "declining"
      : "stable";

  return { agentId: agent.id, overall, breakdown, grade, trend, badge };
}

export function rankAgents(
  agents: Agent[],
  tasks: Task[]
): Array<AgentScore & { rank: number }> {
  const scores = agents.map((a) => scoreAgent(a, tasks, agents));
  scores.sort((a, b) => b.overall - a.overall);
  return scores.map((s, i) => ({ ...s, rank: i + 1 }));
}
