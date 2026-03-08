import type { Agent, Task } from "@shared/schema";
import type { AgentStatus, TaskPriority } from "@shared/constants";

export function getAgentInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getStatusIndicatorClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500";
    case "idle":
      return "bg-amber-500";
    case "busy":
      return "bg-blue-500";
    case "offline":
      return "bg-gray-400 dark:bg-gray-600";
    case "suspended":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

export function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getPriorityBadgeVariant(
  priority: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "critical":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
}

export function getTaskStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    case "review":
      return "outline";
    case "pending":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

export function formatTaskStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getRoleTierLabel(tier: number): string {
  switch (tier) {
    case 0:
      return "Executive";
    case 1:
      return "Vice President";
    case 2:
      return "Lead / Manager";
    case 3:
      return "Individual Contributor";
    default:
      return "Team Member";
  }
}

export function generateAvatarColor(seed: string | null): string {
  if (!seed) return "hsl(220, 15%, 50%)";

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
}

export function generateAvatarGradient(
  seed: string | null,
): string {
  if (!seed) return "linear-gradient(135deg, hsl(220, 50%, 50%), hsl(260, 50%, 50%))";

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360;

  return `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 60%, 45%))`;
}

export function computeAgentEfficiency(
  agent: Agent,
  tasks: Task[],
): number {
  const agentTasks = tasks.filter(
    (t) => t.assignedAgentId === agent.id,
  );
  if (agentTasks.length === 0) return 100;

  const completed = agentTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const onTime = agentTasks.filter(
    (t) =>
      t.status === "completed" &&
      t.dueDate &&
      t.completedAt &&
      new Date(t.completedAt) <= new Date(t.dueDate),
  ).length;

  const completionScore = (completed / agentTasks.length) * 60;
  const timelinessScore =
    completed > 0 ? (onTime / completed) * 40 : 20;

  return Math.round(completionScore + timelinessScore);
}

export function sortAgentsByHierarchy(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => {
    const tierDiff = (a.tier ?? 0) - (b.tier ?? 0);
    if (tierDiff !== 0) return tierDiff;
    return a.name.localeCompare(b.name);
  });
}

export function filterAgents(
  agents: Agent[],
  filters: {
    search?: string;
    role?: string;
    status?: string;
  },
): Agent[] {
  return agents.filter((agent) => {
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const matchesName = agent.name.toLowerCase().includes(term);
      const matchesRole = agent.role.toLowerCase().includes(term);
      if (!matchesName && !matchesRole) return false;
    }

    if (filters.role && agent.role !== filters.role) return false;
    if (filters.status && agent.status !== filters.status) return false;

    return true;
  });
}

export function formatSolAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K`;
  }
  return amount.toFixed(4);
}

export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
