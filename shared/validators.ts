import { z } from "zod";
import {
  AGENT_ROLES,
  AGENT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  TRANSACTION_TYPES,
  MESSAGE_TYPES,
} from "./constants";

export const solanaAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana wallet address");

export const agentRoleSchema = z.enum(AGENT_ROLES);

export const agentStatusSchema = z.enum(AGENT_STATUSES);

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const taskCategorySchema = z.enum(TASK_CATEGORIES);

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export const messageTypeSchema = z.enum(MESSAGE_TYPES);

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const agentFilterSchema = z.object({
  role: agentRoleSchema.optional(),
  status: agentStatusSchema.optional(),
  organizationId: z.string().optional(),
  parentAgentId: z.string().nullable().optional(),
  search: z.string().optional(),
});

export const taskFilterSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: taskCategorySchema.optional(),
  assignedAgentId: z.string().optional(),
  organizationId: z.string().optional(),
  search: z.string().optional(),
});

export const hierarchyNodeSchema: z.ZodType<HierarchyNode> = z.lazy(() =>
  z.object({
    agent: z.any(),
    children: z.array(hierarchyNodeSchema),
    depth: z.number(),
    totalReports: z.number(),
  }),
);

export interface HierarchyNode {
  agent: {
    id: string;
    name: string;
    role: string;
    status: string;
    tier: number;
    avatarSeed: string | null;
    performanceScore: number | null;
  };
  children: HierarchyNode[];
  depth: number;
  totalReports: number;
}

export interface AgentAnalytics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalTransactions: number;
  totalSpent: number;
  averagePerformance: number;
  taskCompletionRate: number;
  roleDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  weeklyActivity: { day: string; tasks: number; messages: number }[];
}

export interface DashboardMetrics {
  agentCount: number;
  taskCount: number;
  completionRate: number;
  treasuryBalance: number;
  recentActivity: ActivityItem[];
  performanceTrend: { date: string; score: number }[];
}

export interface ActivityItem {
  id: string;
  type: "task" | "transaction" | "message" | "agent";
  title: string;
  description: string;
  timestamp: Date;
  agentName?: string;
  agentRole?: string;
}

export function validateSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function calculateAgentTier(
  role: string,
  parentAgentId: string | null,
): number {
  const executiveRoles = ["CEO", "CTO", "CFO", "CMO", "COO"];
  const vpRoles = [
    "VP Engineering",
    "VP Marketing",
    "VP Sales",
    "VP Operations",
  ];
  const leadRoles = ["Engineering Lead", "Marketing Lead", "Sales Lead"];

  if (executiveRoles.includes(role)) return 0;
  if (vpRoles.includes(role)) return 1;
  if (leadRoles.includes(role) || role === "Product Manager") return 2;
  return parentAgentId ? 3 : 2;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: "emerald",
    idle: "amber",
    busy: "blue",
    offline: "gray",
    suspended: "red",
    pending: "amber",
    in_progress: "blue",
    review: "purple",
    completed: "emerald",
    cancelled: "gray",
  };
  return colorMap[status] || "gray";
}

export function getPriorityWeight(priority: string): number {
  const weights: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return weights[priority] || 0;
}
