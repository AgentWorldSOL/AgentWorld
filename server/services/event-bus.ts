type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

interface EventSubscription {
  id: string;
  handler: EventHandler;
  once: boolean;
}

interface EventMetrics {
  totalEmitted: number;
  totalHandled: number;
  errors: number;
  lastEmittedAt: string | null;
}

class EventBus {
  private listeners = new Map<string, EventSubscription[]>();
  private metrics = new Map<string, EventMetrics>();
  private subscriptionCounter = 0;

  on<T = unknown>(event: string, handler: EventHandler<T>): string {
    const id = this.generateId();
    const subscription: EventSubscription = {
      id,
      handler: handler as EventHandler,
      once: false,
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(subscription);

    return id;
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): string {
    const id = this.generateId();
    const subscription: EventSubscription = {
      id,
      handler: handler as EventHandler,
      once: true,
    };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(subscription);

    return id;
  }

  off(subscriptionId: string): boolean {
    for (const [event, subs] of this.listeners) {
      const idx = subs.findIndex((s) => s.id === subscriptionId);
      if (idx !== -1) {
        subs.splice(idx, 1);
        if (subs.length === 0) this.listeners.delete(event);
        return true;
      }
    }
    return false;
  }

  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const subs = this.listeners.get(event);
    if (!subs || subs.length === 0) return;

    this.trackEmit(event);

    const toRemove: string[] = [];

    for (const sub of subs) {
      try {
        await sub.handler(payload);
        this.trackHandled(event);
        if (sub.once) toRemove.push(sub.id);
      } catch (error) {
        this.trackError(event);
        console.error(`[EventBus] Error in handler for '${event}':`, error);
      }
    }

    for (const id of toRemove) {
      this.off(id);
    }
  }

  emitSync<T = unknown>(event: string, payload: T): void {
    const subs = this.listeners.get(event);
    if (!subs || subs.length === 0) return;

    this.trackEmit(event);

    const toRemove: string[] = [];

    for (const sub of subs) {
      try {
        sub.handler(payload);
        this.trackHandled(event);
        if (sub.once) toRemove.push(sub.id);
      } catch (error) {
        this.trackError(event);
        console.error(`[EventBus] Error in handler for '${event}':`, error);
      }
    }

    for (const id of toRemove) {
      this.off(id);
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  getMetrics(event?: string): Record<string, EventMetrics> {
    const result: Record<string, EventMetrics> = {};
    if (event) {
      const m = this.metrics.get(event);
      if (m) result[event] = m;
    } else {
      for (const [e, m] of this.metrics) {
        result[e] = m;
      }
    }
    return result;
  }

  private generateId(): string {
    return `sub_${++this.subscriptionCounter}_${Date.now().toString(36)}`;
  }

  private initMetrics(event: string): EventMetrics {
    if (!this.metrics.has(event)) {
      this.metrics.set(event, {
        totalEmitted: 0,
        totalHandled: 0,
        errors: 0,
        lastEmittedAt: null,
      });
    }
    return this.metrics.get(event)!;
  }

  private trackEmit(event: string): void {
    const m = this.initMetrics(event);
    m.totalEmitted++;
    m.lastEmittedAt = new Date().toISOString();
  }

  private trackHandled(event: string): void {
    const m = this.initMetrics(event);
    m.totalHandled++;
  }

  private trackError(event: string): void {
    const m = this.initMetrics(event);
    m.errors++;
  }
}

export const eventBus = new EventBus();

export const AgentEvents = {
  CREATED: "agent.created",
  UPDATED: "agent.updated",
  DELETED: "agent.deleted",
  STATUS_CHANGED: "agent.status_changed",
  ASSIGNED: "agent.assigned",
} as const;

export const TaskEvents = {
  CREATED: "task.created",
  UPDATED: "task.updated",
  COMPLETED: "task.completed",
  ASSIGNED: "task.assigned",
  ESCALATED: "task.escalated",
  OVERDUE: "task.overdue",
} as const;

export const WalletEvents = {
  CONNECTED: "wallet.connected",
  DISCONNECTED: "wallet.disconnected",
  TRANSACTION_SENT: "wallet.transaction_sent",
  TRANSACTION_CONFIRMED: "wallet.transaction_confirmed",
  BALANCE_CHANGED: "wallet.balance_changed",
} as const;

export const OrgEvents = {
  CREATED: "org.created",
  UPDATED: "org.updated",
  MEMBER_ADDED: "org.member_added",
  HIERARCHY_CHANGED: "org.hierarchy_changed",
} as const;
