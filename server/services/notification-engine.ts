import type { Agent, Task, Transaction } from "@shared/schema";
import { createLogger } from "../utils/logger";

const logger = createLogger("notification-engine");

interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  recipientAgentId: string | null;
  organizationId: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_overdue"
  | "performance_alert"
  | "salary_payment"
  | "hierarchy_change"
  | "system_alert"
  | "budget_warning";

type NotificationSeverity = "info" | "warning" | "error" | "success";

interface NotificationRule {
  type: NotificationType;
  condition: (context: Record<string, unknown>) => boolean;
  template: (context: Record<string, unknown>) => {
    title: string;
    message: string;
  };
  severity: NotificationSeverity;
}

export class NotificationEngine {
  private notifications: Map<string, Notification> = new Map();
  private rules: NotificationRule[] = [];
  private counter = 0;

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    this.rules.push({
      type: "task_assigned",
      condition: (ctx) => !!ctx.taskId && !!ctx.agentId,
      template: (ctx) => ({
        title: "New Task Assigned",
        message: `Task "${ctx.taskTitle}" has been assigned to ${ctx.agentName}.`,
      }),
      severity: "info",
    });

    this.rules.push({
      type: "task_completed",
      condition: (ctx) => ctx.status === "completed",
      template: (ctx) => ({
        title: "Task Completed",
        message: `Task "${ctx.taskTitle}" has been completed by ${ctx.agentName}.`,
      }),
      severity: "success",
    });

    this.rules.push({
      type: "task_overdue",
      condition: (ctx) => {
        const dueDate = ctx.dueDate as Date | undefined;
        return !!dueDate && new Date(dueDate) < new Date();
      },
      template: (ctx) => ({
        title: "Task Overdue",
        message: `Task "${ctx.taskTitle}" is past its deadline.`,
      }),
      severity: "warning",
    });

    this.rules.push({
      type: "performance_alert",
      condition: (ctx) => {
        const score = ctx.performanceScore as number;
        return score < 50;
      },
      template: (ctx) => ({
        title: "Performance Alert",
        message: `Agent "${ctx.agentName}" performance dropped to ${ctx.performanceScore}%.`,
      }),
      severity: "warning",
    });

    this.rules.push({
      type: "salary_payment",
      condition: (ctx) => ctx.transactionType === "salary",
      template: (ctx) => ({
        title: "Salary Processed",
        message: `Salary of ${ctx.amount} SOL paid to ${ctx.agentName}.`,
      }),
      severity: "success",
    });

    this.rules.push({
      type: "budget_warning",
      condition: (ctx) => {
        const remaining = ctx.remainingBudget as number;
        const total = ctx.totalBudget as number;
        return total > 0 && remaining / total < 0.2;
      },
      template: (ctx) => ({
        title: "Budget Warning",
        message: `Organization budget is below 20%. Remaining: ${ctx.remainingBudget} SOL.`,
      }),
      severity: "error",
    });

    this.rules.push({
      type: "hierarchy_change",
      condition: (ctx) => !!ctx.reassignment,
      template: (ctx) => ({
        title: "Hierarchy Updated",
        message: `${ctx.agentName} now reports to ${ctx.newParentName || "no supervisor"}.`,
      }),
      severity: "info",
    });
  }

  createNotification(
    type: NotificationType,
    organizationId: string,
    context: Record<string, unknown>,
    recipientAgentId: string | null = null,
  ): Notification | null {
    const rule = this.rules.find((r) => r.type === type);
    if (!rule) {
      logger.warn("No rule found for notification type", { type });
      return null;
    }

    if (!rule.condition(context)) {
      return null;
    }

    const { title, message } = rule.template(context);
    const id = `notif_${++this.counter}_${Date.now()}`;

    const notification: Notification = {
      id,
      type,
      severity: rule.severity,
      title,
      message,
      recipientAgentId,
      organizationId,
      metadata: context,
      read: false,
      createdAt: new Date(),
    };

    this.notifications.set(id, notification);

    logger.info("Notification created", {
      id,
      type,
      severity: rule.severity,
      title,
    });

    return notification;
  }

  getNotifications(
    organizationId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      agentId?: string;
      type?: NotificationType;
    },
  ): Notification[] {
    let results = Array.from(this.notifications.values()).filter(
      (n) => n.organizationId === organizationId,
    );

    if (options?.unreadOnly) {
      results = results.filter((n) => !n.read);
    }

    if (options?.agentId) {
      results = results.filter(
        (n) =>
          n.recipientAgentId === options.agentId ||
          n.recipientAgentId === null,
      );
    }

    if (options?.type) {
      results = results.filter((n) => n.type === options.type);
    }

    results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    notification.read = true;
    return true;
  }

  markAllAsRead(organizationId: string): number {
    let count = 0;
    for (const notification of this.notifications.values()) {
      if (
        notification.organizationId === organizationId &&
        !notification.read
      ) {
        notification.read = true;
        count++;
      }
    }
    return count;
  }

  getUnreadCount(organizationId: string): number {
    return Array.from(this.notifications.values()).filter(
      (n) => n.organizationId === organizationId && !n.read,
    ).length;
  }

  processTaskEvent(
    task: Task,
    agent: Agent | null,
    eventType: "assigned" | "completed" | "overdue",
  ): Notification | null {
    const typeMap: Record<string, NotificationType> = {
      assigned: "task_assigned",
      completed: "task_completed",
      overdue: "task_overdue",
    };

    return this.createNotification(
      typeMap[eventType],
      task.organizationId,
      {
        taskId: task.id,
        taskTitle: task.title,
        agentId: agent?.id,
        agentName: agent?.name || "Unassigned",
        status: task.status,
        dueDate: task.dueDate,
      },
      agent?.id || null,
    );
  }

  processTransactionEvent(
    transaction: Transaction,
    recipientAgent: Agent | null,
  ): Notification | null {
    return this.createNotification(
      "salary_payment",
      transaction.organizationId,
      {
        transactionType: transaction.type,
        amount: transaction.amount,
        agentName: recipientAgent?.name || "Treasury",
        agentId: recipientAgent?.id,
      },
      recipientAgent?.id || null,
    );
  }

  clearOldNotifications(maxAgeHours: number = 168): number {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let cleared = 0;

    for (const [id, notification] of this.notifications) {
      if (notification.createdAt.getTime() < cutoff) {
        this.notifications.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info("Cleared old notifications", { count: cleared });
    }

    return cleared;
  }
}

export const notificationEngine = new NotificationEngine();
