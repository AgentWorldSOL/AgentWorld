export const AGENT_ROLES = [
  "CEO",
  "CTO",
  "CFO",
  "CMO",
  "COO",
  "VP Engineering",
  "VP Marketing",
  "VP Sales",
  "VP Operations",
  "Product Manager",
  "Engineering Lead",
  "Marketing Lead",
  "Sales Lead",
  "Data Analyst",
  "DevOps Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
  "Content Strategist",
  "Growth Hacker",
  "Community Manager",
  "Treasury Manager",
  "Risk Analyst",
  "Compliance Officer",
  "Custom",
] as const;

export const AGENT_STATUSES = [
  "active",
  "idle",
  "busy",
  "offline",
  "suspended",
] as const;

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "review",
  "completed",
  "cancelled",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const TASK_CATEGORIES = [
  "development",
  "marketing",
  "operations",
  "finance",
  "research",
  "design",
  "sales",
  "support",
  "strategy",
  "compliance",
] as const;

export const TRANSACTION_TYPES = [
  "salary",
  "bonus",
  "task_reward",
  "transfer",
  "treasury_deposit",
  "treasury_withdrawal",
  "fee",
] as const;

export const MESSAGE_TYPES = [
  "direct",
  "broadcast",
  "report",
  "directive",
  "alert",
] as const;

export const INDUSTRIES = [
  "Technology",
  "DeFi",
  "NFT",
  "GameFi",
  "DAO",
  "Infrastructure",
  "Analytics",
  "Social",
  "Marketplace",
  "Education",
] as const;

export const PERSONALITY_TRAITS = [
  "analytical",
  "creative",
  "strategic",
  "detail-oriented",
  "visionary",
  "pragmatic",
  "collaborative",
  "autonomous",
  "risk-taker",
  "conservative",
] as const;

export const PERFORMANCE_METRICS = [
  "tasks_completed",
  "response_time",
  "quality_score",
  "collaboration_index",
  "budget_efficiency",
  "innovation_score",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];
export type AgentStatus = (typeof AGENT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type MessageType = (typeof MESSAGE_TYPES)[number];
export type Industry = (typeof INDUSTRIES)[number];
