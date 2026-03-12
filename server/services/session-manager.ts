import { randomBytes, createHash } from "crypto";

interface SessionData {
  id: string;
  orgId: number;
  walletAddress?: string;
  role: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  metadata: Record<string, unknown>;
}

interface SessionManagerOptions {
  ttlMs: number;
  renewThresholdMs: number;
  maxSessionsPerOrg: number;
}

const DEFAULT_SESSION_OPTIONS: SessionManagerOptions = {
  ttlMs: 60 * 60 * 1000,
  renewThresholdMs: 15 * 60 * 1000,
  maxSessionsPerOrg: 50,
};

class SessionManager {
  private sessions = new Map<string, SessionData>();
  private options: SessionManagerOptions;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(options: Partial<SessionManagerOptions> = {}) {
    this.options = { ...DEFAULT_SESSION_OPTIONS, ...options };
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  create(orgId: number, role: string, meta: Record<string, unknown> = {}): SessionData {
    const orgSessions = this.getOrgSessions(orgId);
    if (orgSessions.length >= this.options.maxSessionsPerOrg) {
      const oldest = orgSessions.sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
      this.sessions.delete(oldest.id);
    }

    const now = Date.now();
    const session: SessionData = {
      id: this.generateSessionId(),
      orgId,
      role,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: now + this.options.ttlMs,
      metadata: meta,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = Date.now();
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastActiveAt = now;

    if (session.expiresAt - now < this.options.renewThresholdMs) {
      session.expiresAt = now + this.options.ttlMs;
    }

    return session;
  }

  update(sessionId: string, updates: Partial<Pick<SessionData, "walletAddress" | "role" | "metadata">>): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    if (updates.walletAddress !== undefined) session.walletAddress = updates.walletAddress;
    if (updates.role !== undefined) session.role = updates.role;
    if (updates.metadata !== undefined) session.metadata = { ...session.metadata, ...updates.metadata };

    return true;
  }

  destroy(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  destroyOrgSessions(orgId: number): number {
    const toDelete = this.getOrgSessions(orgId).map((s) => s.id);
    toDelete.forEach((id) => this.sessions.delete(id));
    return toDelete.length;
  }

  isValid(sessionId: string): boolean {
    return this.get(sessionId) !== null;
  }

  getOrgSessions(orgId: number): SessionData[] {
    return Array.from(this.sessions.values()).filter((s) => s.orgId === orgId);
  }

  getStats(): { total: number; expired: number; byOrg: Record<number, number> } {
    const now = Date.now();
    let expired = 0;
    const byOrg: Record<number, number> = {};

    for (const session of this.sessions.values()) {
      if (now > session.expiresAt) expired++;
      byOrg[session.orgId] = (byOrg[session.orgId] || 0) + 1;
    }

    return { total: this.sessions.size, expired, byOrg };
  }

  private cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        removed++;
      }
    }

    return removed;
  }

  private generateSessionId(): string {
    const raw = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(raw + Date.now()).digest("hex");
    return `sess_${hash.substring(0, 40)}`;
  }

  destroy_manager(): void {
    clearInterval(this.cleanupInterval);
  }
}

export const sessionManager = new SessionManager();
