import type { Agent, Task, Transaction, Organization } from "../../shared/schema";

export const MIGRATION_VERSION = "2.0.0";
export const MIGRATION_FROM = "1.x";

interface MigrationResult {
  version: string;
  migratedAt: string;
  summary: Record<string, MigrationStepResult>;
  success: boolean;
  errors: string[];
  warnings: string[];
}

interface MigrationStepResult {
  processed: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

interface V1Agent extends Agent {
  skills?: string;
}

interface V2Agent extends Omit<Agent, "metadata"> {
  capabilities: string[];
  memoryEnabled: boolean;
  llmProvider: string | null;
  onChainAddress: string | null;
  reputationScore: number;
  metadata: Record<string, unknown> & {
    v2migrated: boolean;
    migratedAt: string;
    originalFields: Record<string, unknown>;
  };
}

interface V1Task extends Task {
  notes?: string;
}

interface V2Task extends Omit<Task, "metadata"> {
  estimatedMs: number | null;
  actualMs: number | null;
  checklistItems: Array<{ id: string; text: string; done: boolean }>;
  metadata: Record<string, unknown> & {
    v2migrated: boolean;
  };
}

function migrateAgent(agent: V1Agent): { result: V2Agent; warnings: string[] } {
  const warnings: string[] = [];

  const capabilities: string[] = [];
  if (agent.role) {
    const roleCaps: Record<string, string[]> = {
      ceo: ["strategy", "leadership", "resource_allocation"],
      cto: ["architecture", "engineering", "technical_strategy"],
      cfo: ["finance", "budgeting", "risk_management"],
      cmo: ["marketing", "growth", "brand_management"],
      developer: ["coding", "testing", "code_review"],
      designer: ["ui_design", "ux_research", "prototyping"],
      analyst: ["data_analysis", "reporting", "forecasting"],
    };
    capabilities.push(...(roleCaps[agent.role.toLowerCase()] || ["general"]));
  }

  const oldMetadata =
    typeof agent.metadata === "string"
      ? (() => {
          try {
            return JSON.parse(agent.metadata);
          } catch {
            return {};
          }
        })()
      : agent.metadata || {};

  if ((agent as V1Agent).skills) {
    warnings.push(`Agent ${agent.id}: 'skills' field deprecated — migrated to capabilities array`);
  }

  const v2Agent: V2Agent = {
    ...agent,
    capabilities,
    memoryEnabled: false,
    llmProvider: null,
    onChainAddress: null,
    reputationScore: Math.round((agent.performance || 0) * 0.8),
    metadata: {
      ...oldMetadata,
      v2migrated: true,
      migratedAt: new Date().toISOString(),
      originalFields: {
        performance: agent.performance,
        status: agent.status,
      },
    },
  };

  return { result: v2Agent, warnings };
}

function migrateTask(task: V1Task): { result: V2Task; warnings: string[] } {
  const warnings: string[] = [];

  const oldMetadata =
    typeof task.metadata === "string"
      ? (() => {
          try {
            return JSON.parse(task.metadata);
          } catch {
            return {};
          }
        })()
      : task.metadata || {};

  let actualMs: number | null = null;
  if (task.status === "completed" && task.createdAt && task.updatedAt) {
    const created = new Date(task.createdAt).getTime();
    const updated = new Date(task.updatedAt).getTime();
    if (updated > created) actualMs = updated - created;
  }

  if ((task as V1Task).notes) {
    warnings.push(`Task ${task.id}: 'notes' field deprecated — content preserved in metadata`);
  }

  const v2Task: V2Task = {
    ...task,
    estimatedMs: null,
    actualMs,
    checklistItems: [],
    metadata: {
      ...oldMetadata,
      v2migrated: true,
      notes: (task as V1Task).notes || undefined,
    },
  };

  return { result: v2Task, warnings };
}

function migrateOrganization(org: Organization): {
  result: Organization & { planTier: string; agentLimit: number };
  warnings: string[];
} {
  return {
    result: {
      ...org,
      planTier: "starter",
      agentLimit: 25,
    },
    warnings: [],
  };
}

export async function runV2Migration(data: {
  organizations: Organization[];
  agents: Agent[];
  tasks: Task[];
  transactions: Transaction[];
}): Promise<MigrationResult> {
  const errors: string[] = [];
  const allWarnings: string[] = [];
  const summary: Record<string, MigrationStepResult> = {};

  const agentStep: MigrationStepResult = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  for (const agent of data.agents) {
    agentStep.processed++;
    try {
      const { warnings } = migrateAgent(agent as V1Agent);
      allWarnings.push(...warnings);
      agentStep.migrated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      agentStep.errors.push(`Agent ${agent.id}: ${msg}`);
      agentStep.skipped++;
    }
  }
  summary.agents = agentStep;

  const taskStep: MigrationStepResult = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  for (const task of data.tasks) {
    taskStep.processed++;
    try {
      const { warnings } = migrateTask(task as V1Task);
      allWarnings.push(...warnings);
      taskStep.migrated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      taskStep.errors.push(`Task ${task.id}: ${msg}`);
      taskStep.skipped++;
    }
  }
  summary.tasks = taskStep;

  const orgStep: MigrationStepResult = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  for (const org of data.organizations) {
    orgStep.processed++;
    try {
      migrateOrganization(org);
      orgStep.migrated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      orgStep.errors.push(`Org ${org.id}: ${msg}`);
      orgStep.skipped++;
    }
  }
  summary.organizations = orgStep;

  const txStep: MigrationStepResult = {
    processed: data.transactions.length,
    migrated: data.transactions.length,
    skipped: 0,
    errors: [],
  };
  summary.transactions = txStep;

  const stepErrors = Object.values(summary).flatMap((s) => s.errors);
  errors.push(...stepErrors);

  return {
    version: MIGRATION_VERSION,
    migratedAt: new Date().toISOString(),
    summary,
    success: errors.length === 0,
    errors,
    warnings: allWarnings,
  };
}

export function validateMigrationReadiness(data: {
  agents: Agent[];
  tasks: Task[];
}): { ready: boolean; blockers: string[]; recommendations: string[] } {
  const blockers: string[] = [];
  const recommendations: string[] = [];

  const agentsWithoutRoles = data.agents.filter((a) => !a.role);
  if (agentsWithoutRoles.length > 0) {
    blockers.push(
      `${agentsWithoutRoles.length} agent(s) missing role field — required for v2 capability mapping`
    );
  }

  const tasksWithoutStatus = data.tasks.filter((t) => !t.status);
  if (tasksWithoutStatus.length > 0) {
    blockers.push(
      `${tasksWithoutStatus.length} task(s) missing status field — required for v2 schema`
    );
  }

  const inProgressTasks = data.tasks.filter((t) => t.status === "in_progress");
  if (inProgressTasks.length > 0) {
    recommendations.push(
      `${inProgressTasks.length} task(s) currently in-progress — consider completing or pausing before migration`
    );
  }

  const agentsWithoutPerformance = data.agents.filter(
    (a) => a.performance === null || a.performance === undefined
  );
  if (agentsWithoutPerformance.length > 0) {
    recommendations.push(
      `${agentsWithoutPerformance.length} agent(s) have no performance score — reputation scores will default to 0`
    );
  }

  return {
    ready: blockers.length === 0,
    blockers,
    recommendations,
  };
}
