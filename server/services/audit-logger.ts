interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceId: string | number;
  actorId: string;
  actorType: "user" | "agent" | "system";
  orgId: number;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ip?: string;
  requestId?: string;
}

interface AuditQuery {
  orgId?: number;
  resource?: string;
  action?: string;
  actorId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries: number;
  private counter = 0;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  log(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const fullEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.entries.push(fullEntry);

    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    if (this.shouldLogToConsole(entry.action)) {
      console.log(
        `[AUDIT] ${entry.action} ${entry.resource}:${entry.resourceId} by ${entry.actorType}:${entry.actorId}`
      );
    }

    return fullEntry;
  }

  logAgentAction(
    action: string,
    agentId: number,
    orgId: number,
    actorId: string,
    changes?: Record<string, { from: unknown; to: unknown }>
  ): AuditEntry {
    return this.log({
      action,
      resource: "agent",
      resourceId: agentId,
      actorId,
      actorType: "user",
      orgId,
      changes,
    });
  }

  logTaskAction(
    action: string,
    taskId: number,
    orgId: number,
    actorId: string,
    changes?: Record<string, { from: unknown; to: unknown }>
  ): AuditEntry {
    return this.log({
      action,
      resource: "task",
      resourceId: taskId,
      actorId,
      actorType: "user",
      orgId,
      changes,
    });
  }

  logWalletAction(
    action: string,
    address: string,
    orgId: number,
    metadata?: Record<string, unknown>
  ): AuditEntry {
    return this.log({
      action,
      resource: "wallet",
      resourceId: address,
      actorId: "system",
      actorType: "system",
      orgId,
      metadata,
    });
  }

  query(params: AuditQuery): { entries: AuditEntry[]; total: number } {
    let filtered = [...this.entries];

    if (params.orgId !== undefined) {
      filtered = filtered.filter((e) => e.orgId === params.orgId);
    }
    if (params.resource) {
      filtered = filtered.filter((e) => e.resource === params.resource);
    }
    if (params.action) {
      filtered = filtered.filter((e) => e.action === params.action);
    }
    if (params.actorId) {
      filtered = filtered.filter((e) => e.actorId === params.actorId);
    }
    if (params.since) {
      const sinceTs = params.since.getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceTs);
    }
    if (params.until) {
      const untilTs = params.until.getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= untilTs);
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const entries = filtered.slice(offset, offset + limit);

    return { entries, total };
  }

  getRecentActivity(orgId: number, limit: number = 20): AuditEntry[] {
    return this.entries
      .filter((e) => e.orgId === orgId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getActionCounts(orgId: number, since?: Date): Record<string, number> {
    const counts: Record<string, number> = {};
    const sinceTs = since?.getTime() || 0;

    for (const entry of this.entries) {
      if (entry.orgId !== orgId) continue;
      if (sinceTs && new Date(entry.timestamp).getTime() < sinceTs) continue;

      const key = `${entry.resource}.${entry.action}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  }

  clear(orgId?: number): number {
    if (orgId !== undefined) {
      const before = this.entries.length;
      this.entries = this.entries.filter((e) => e.orgId !== orgId);
      return before - this.entries.length;
    }
    const count = this.entries.length;
    this.entries = [];
    return count;
  }

  private generateId(): string {
    return `audit_${++this.counter}_${Date.now().toString(36)}`;
  }

  private shouldLogToConsole(action: string): boolean {
    const criticalActions = ["delete", "transfer", "admin_change", "permission_change"];
    return criticalActions.some((a) => action.toLowerCase().includes(a));
  }
}

export const auditLogger = new AuditLogger();
