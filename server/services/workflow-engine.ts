import type { Agent, Task } from "../../shared/schema";

export type WorkflowTrigger =
  | "task_created"
  | "task_completed"
  | "task_overdue"
  | "agent_idle"
  | "agent_busy"
  | "performance_drop"
  | "schedule"
  | "manual";

export type WorkflowAction =
  | "assign_task"
  | "reassign_task"
  | "notify_manager"
  | "escalate_priority"
  | "update_agent_status"
  | "create_follow_up_task"
  | "send_notification"
  | "log_event";

export interface WorkflowCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_contains";
  value: unknown;
}

export interface WorkflowStep {
  id: string;
  action: WorkflowAction;
  params: Record<string, unknown>;
  delay?: number;
  condition?: WorkflowCondition;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  steps: WorkflowStep[];
  priority: number;
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

interface WorkflowContext {
  agent?: Agent;
  task?: Task;
  orgId: number;
  triggeredAt: string;
  metadata?: Record<string, unknown>;
}

function evaluateCondition(condition: WorkflowCondition, context: WorkflowContext): boolean {
  const source = { ...context.agent, ...context.task, ...context.metadata } as Record<string, unknown>;
  const fieldValue = source[condition.field];

  switch (condition.operator) {
    case "eq": return fieldValue === condition.value;
    case "neq": return fieldValue !== condition.value;
    case "gt": return Number(fieldValue) > Number(condition.value);
    case "lt": return Number(fieldValue) < Number(condition.value);
    case "gte": return Number(fieldValue) >= Number(condition.value);
    case "lte": return Number(fieldValue) <= Number(condition.value);
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(String(condition.value));
    case "not_contains":
      return typeof fieldValue === "string" && !fieldValue.includes(String(condition.value));
    default:
      return false;
  }
}

function evaluateConditions(conditions: WorkflowCondition[], context: WorkflowContext): boolean {
  return conditions.every((c) => evaluateCondition(c, context));
}

export class WorkflowEngine {
  private rules: WorkflowRule[] = [];
  private executionLog: Array<{
    ruleId: string;
    triggeredAt: string;
    success: boolean;
    error?: string;
  }> = [];

  addRule(rule: WorkflowRule): void {
    const existing = this.rules.findIndex((r) => r.id === rule.id);
    if (existing >= 0) {
      this.rules[existing] = rule;
    } else {
      this.rules.push(rule);
    }
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(ruleId: string): boolean {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== ruleId);
    return this.rules.length < before;
  }

  getRules(): WorkflowRule[] {
    return [...this.rules];
  }

  getRuleById(ruleId: string): WorkflowRule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  async trigger(
    event: WorkflowTrigger,
    context: WorkflowContext,
    actionHandlers: Partial<Record<WorkflowAction, (step: WorkflowStep, ctx: WorkflowContext) => Promise<void>>>
  ): Promise<{ triggered: number; executed: number; errors: string[] }> {
    const matchingRules = this.rules.filter(
      (r) => r.enabled && r.trigger === event && evaluateConditions(r.conditions, context)
    );

    let executed = 0;
    const errors: string[] = [];

    for (const rule of matchingRules) {
      try {
        for (const step of rule.steps) {
          if (step.condition && !evaluateCondition(step.condition, context)) continue;

          const handler = actionHandlers[step.action];
          if (!handler) continue;

          if (step.delay && step.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, step.delay));
          }

          await handler(step, context);
        }

        rule.triggerCount++;
        rule.lastTriggeredAt = new Date().toISOString();
        this.executionLog.push({ ruleId: rule.id, triggeredAt: context.triggeredAt, success: true });
        executed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Workflow execution failed";
        errors.push(`Rule '${rule.name}': ${msg}`);
        this.executionLog.push({
          ruleId: rule.id,
          triggeredAt: context.triggeredAt,
          success: false,
          error: msg,
        });
      }
    }

    return { triggered: matchingRules.length, executed, errors };
  }

  getExecutionLog(limit: number = 50): typeof this.executionLog {
    return this.executionLog.slice(-limit);
  }

  clearLog(): void {
    this.executionLog = [];
  }
}

export const workflowEngine = new WorkflowEngine();

export function createDefaultRules(): WorkflowRule[] {
  const now = new Date().toISOString();

  return [
    {
      id: "auto-escalate-critical",
      name: "Auto-escalate overdue critical tasks",
      description: "Notifies manager when a critical task becomes overdue",
      enabled: true,
      trigger: "task_overdue",
      conditions: [{ field: "priority", operator: "eq", value: "critical" }],
      steps: [
        {
          id: "step-1",
          action: "escalate_priority",
          params: { notifyManager: true },
        },
        {
          id: "step-2",
          action: "send_notification",
          params: { severity: "error", channel: "websocket" },
        },
      ],
      priority: 10,
      createdAt: now,
      triggerCount: 0,
    },
    {
      id: "idle-agent-assign",
      name: "Assign pending tasks to idle agents",
      description: "Automatically assigns unassigned tasks to agents that become idle",
      enabled: true,
      trigger: "agent_idle",
      conditions: [],
      steps: [
        {
          id: "step-1",
          action: "assign_task",
          params: { preferHighPriority: true },
        },
      ],
      priority: 5,
      createdAt: now,
      triggerCount: 0,
    },
  ];
}
