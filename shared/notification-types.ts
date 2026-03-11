export type NotificationType =
  | "agent_created"
  | "agent_updated"
  | "agent_deleted"
  | "agent_status_changed"
  | "task_assigned"
  | "task_completed"
  | "task_overdue"
  | "task_escalated"
  | "wallet_connected"
  | "wallet_transaction"
  | "wallet_low_balance"
  | "org_updated"
  | "hierarchy_changed"
  | "system_alert"
  | "automation_triggered";

export type NotificationSeverity = "info" | "success" | "warning" | "error";
export type NotificationChannel = "websocket" | "email" | "slack" | "in_app";

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  orgId: number;
  targetId?: number | string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  channels: NotificationChannel[];
  read: boolean;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
}

const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    severity: NotificationSeverity;
    title: string;
    defaultChannels: NotificationChannel[];
    ttlMs: number;
  }
> = {
  agent_created: {
    severity: "success",
    title: "Agent Created",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  agent_updated: {
    severity: "info",
    title: "Agent Updated",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 3 * 24 * 60 * 60 * 1000,
  },
  agent_deleted: {
    severity: "warning",
    title: "Agent Removed",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  agent_status_changed: {
    severity: "info",
    title: "Agent Status Changed",
    defaultChannels: ["websocket"],
    ttlMs: 24 * 60 * 60 * 1000,
  },
  task_assigned: {
    severity: "info",
    title: "Task Assigned",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  task_completed: {
    severity: "success",
    title: "Task Completed",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  task_overdue: {
    severity: "error",
    title: "Task Overdue",
    defaultChannels: ["in_app", "websocket", "email"],
    ttlMs: 14 * 24 * 60 * 60 * 1000,
  },
  task_escalated: {
    severity: "warning",
    title: "Task Escalated",
    defaultChannels: ["in_app", "websocket", "email"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  wallet_connected: {
    severity: "success",
    title: "Wallet Connected",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 24 * 60 * 60 * 1000,
  },
  wallet_transaction: {
    severity: "info",
    title: "Transaction Recorded",
    defaultChannels: ["in_app", "websocket"],
    ttlMs: 30 * 24 * 60 * 60 * 1000,
  },
  wallet_low_balance: {
    severity: "warning",
    title: "Low Wallet Balance",
    defaultChannels: ["in_app", "websocket", "email"],
    ttlMs: 24 * 60 * 60 * 1000,
  },
  org_updated: {
    severity: "info",
    title: "Organization Updated",
    defaultChannels: ["in_app"],
    ttlMs: 3 * 24 * 60 * 60 * 1000,
  },
  hierarchy_changed: {
    severity: "info",
    title: "Hierarchy Updated",
    defaultChannels: ["websocket"],
    ttlMs: 24 * 60 * 60 * 1000,
  },
  system_alert: {
    severity: "error",
    title: "System Alert",
    defaultChannels: ["in_app", "websocket", "email"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  automation_triggered: {
    severity: "info",
    title: "Automation Triggered",
    defaultChannels: ["in_app"],
    ttlMs: 3 * 24 * 60 * 60 * 1000,
  },
};

let notifCounter = 0;

export function createNotification(
  type: NotificationType,
  orgId: number,
  message: string,
  overrides: Partial<Omit<NotificationPayload, "id" | "type" | "orgId" | "createdAt" | "read">> = {}
): NotificationPayload {
  const config = NOTIFICATION_CONFIG[type];
  const now = new Date();

  return {
    id: `notif_${++notifCounter}_${now.getTime().toString(36)}`,
    type,
    severity: overrides.severity || config.severity,
    title: overrides.title || config.title,
    message,
    orgId,
    channels: overrides.channels || config.defaultChannels,
    read: false,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + config.ttlMs).toISOString(),
    ...overrides,
  };
}

export function shouldDeliver(
  notification: NotificationPayload,
  channel: NotificationChannel
): boolean {
  return notification.channels.includes(channel);
}

export function isExpired(notification: NotificationPayload): boolean {
  if (!notification.expiresAt) return false;
  return new Date(notification.expiresAt).getTime() < Date.now();
}
