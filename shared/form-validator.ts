import { z } from "zod";

const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const URL_SAFE_STRING_REGEX = /^[a-zA-Z0-9_\-\s]+$/;

export const AgentFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters")
    .regex(URL_SAFE_STRING_REGEX, "Name can only contain letters, numbers, spaces, hyphens, and underscores")
    .transform((v) => v.trim()),

  role: z
    .string()
    .min(1, "Role is required")
    .max(50, "Role cannot exceed 50 characters"),

  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .transform((v) => v?.trim()),

  parentId: z
    .number()
    .int("Parent ID must be an integer")
    .positive("Parent ID must be positive")
    .nullable()
    .optional(),

  walletAddress: z
    .string()
    .regex(SOL_ADDRESS_REGEX, "Invalid Solana wallet address")
    .optional()
    .or(z.literal("")),

  performance: z
    .number()
    .min(0, "Performance must be at least 0")
    .max(100, "Performance cannot exceed 100")
    .default(0),

  orgId: z
    .number()
    .int()
    .positive("Organization ID is required"),
});

export const TaskFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .transform((v) => v.trim()),

  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .transform((v) => v?.trim()),

  priority: z.enum(["low", "medium", "high", "critical"], {
    errorMap: () => ({ message: "Priority must be low, medium, high, or critical" }),
  }),

  status: z
    .enum(["pending", "in_progress", "completed", "cancelled", "blocked"])
    .default("pending"),

  category: z
    .string()
    .max(50, "Category cannot exceed 50 characters")
    .optional(),

  assigneeId: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),

  dueDate: z
    .string()
    .datetime({ message: "Invalid date format. Use ISO 8601." })
    .optional()
    .or(z.literal("")),

  orgId: z.number().int().positive("Organization ID is required"),
});

export const OrganizationFormSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name cannot exceed 100 characters")
    .transform((v) => v.trim()),

  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  industry: z
    .string()
    .max(50)
    .optional(),

  size: z
    .enum(["startup", "small", "medium", "large", "enterprise"])
    .optional(),
});

export const WalletConnectSchema = z.object({
  address: z
    .string()
    .regex(SOL_ADDRESS_REGEX, "Invalid Solana wallet address"),

  orgId: z.number().int().positive(),

  agentId: z.number().int().positive().optional(),
});

export type AgentFormData = z.infer<typeof AgentFormSchema>;
export type TaskFormData = z.infer<typeof TaskFormSchema>;
export type OrganizationFormData = z.infer<typeof OrganizationFormSchema>;
export type WalletConnectData = z.infer<typeof WalletConnectSchema>;

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!result[path]) {
      result[path] = issue.message;
    }
  }
  return result;
}
