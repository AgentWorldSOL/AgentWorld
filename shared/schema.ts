import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id),
  logoUrl: text("logo_url"),
  industry: text("industry"),
  treasuryAddress: text("treasury_address"),
  totalBudget: real("total_budget").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  parentAgentId: varchar("parent_agent_id"),
  status: text("status").notNull().default("active"),
  personality: text("personality"),
  capabilities: text("capabilities").array(),
  walletAddress: text("wallet_address"),
  salary: real("salary").default(0),
  performanceScore: real("performance_score").default(100),
  avatarSeed: text("avatar_seed"),
  tier: integer("tier").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  assignedAgentId: varchar("assigned_agent_id").references(() => agents.id),
  createdByAgentId: varchar("created_by_agent_id").references(() => agents.id),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  category: text("category"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  reward: real("reward").default(0),
  dependencies: text("dependencies").array(),
  output: text("output"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  fromAgentId: varchar("from_agent_id"),
  toAgentId: varchar("to_agent_id"),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentMessages = pgTable("agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  fromAgentId: varchar("from_agent_id")
    .notNull()
    .references(() => agents.id),
  toAgentId: varchar("to_agent_id").references(() => agents.id),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("direct"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const performanceLogs = pgTable("performance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id")
    .notNull()
    .references(() => agents.id),
  metric: text("metric").notNull(),
  value: real("value").notNull(),
  period: text("period").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  walletAddress: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  description: true,
  ownerId: true,
  industry: true,
  treasuryAddress: true,
  totalBudget: true,
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  role: true,
  description: true,
  organizationId: true,
  parentAgentId: true,
  personality: true,
  capabilities: true,
  walletAddress: true,
  salary: true,
  avatarSeed: true,
  tier: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  organizationId: true,
  assignedAgentId: true,
  createdByAgentId: true,
  priority: true,
  category: true,
  dueDate: true,
  reward: true,
  dependencies: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  organizationId: true,
  fromAgentId: true,
  toAgentId: true,
  amount: true,
  type: true,
  description: true,
  txHash: true,
});

export const insertMessageSchema = createInsertSchema(agentMessages).pick({
  organizationId: true,
  fromAgentId: true,
  toAgentId: true,
  content: true,
  messageType: true,
});

export const insertPerformanceLogSchema = createInsertSchema(
  performanceLogs,
).pick({
  agentId: true,
  metric: true,
  value: true,
  period: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertPerformanceLog = z.infer<typeof insertPerformanceLogSchema>;
export type PerformanceLog = typeof performanceLogs.$inferSelect;
