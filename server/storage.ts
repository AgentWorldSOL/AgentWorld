import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  Organization,
  InsertOrganization,
  Agent,
  InsertAgent,
  Task,
  InsertTask,
  Transaction,
  InsertTransaction,
  AgentMessage,
  InsertMessage,
  PerformanceLog,
  InsertPerformanceLog,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByOwner(ownerId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(
    id: string,
    updates: Partial<Organization>,
  ): Promise<Organization | undefined>;
  deleteOrganization(id: string): Promise<boolean>;

  getAgent(id: string): Promise<Agent | undefined>;
  getAgentsByOrganization(orgId: string): Promise<Agent[]>;
  getAgentsByParent(parentId: string): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;

  getTask(id: string): Promise<Task | undefined>;
  getTasksByOrganization(orgId: string): Promise<Task[]>;
  getTasksByAgent(agentId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByOrganization(orgId: string): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransaction(
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction | undefined>;

  getMessage(id: string): Promise<AgentMessage | undefined>;
  getMessagesByOrganization(orgId: string): Promise<AgentMessage[]>;
  getMessagesByAgent(agentId: string): Promise<AgentMessage[]>;
  createMessage(msg: InsertMessage): Promise<AgentMessage>;
  markMessageRead(id: string): Promise<boolean>;

  getPerformanceLogs(agentId: string): Promise<PerformanceLog[]>;
  createPerformanceLog(log: InsertPerformanceLog): Promise<PerformanceLog>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private organizations: Map<string, Organization> = new Map();
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private messages: Map<string, AgentMessage> = new Map();
  private performanceLogs: Map<string, PerformanceLog> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      displayName: insertUser.displayName || null,
      avatarUrl: null,
      walletAddress: insertUser.walletAddress || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizationsByOwner(ownerId: string): Promise<Organization[]> {
    return Array.from(this.organizations.values()).filter(
      (org) => org.ownerId === ownerId,
    );
  }

  async createOrganization(
    insertOrg: InsertOrganization,
  ): Promise<Organization> {
    const id = randomUUID();
    const org: Organization = {
      ...insertOrg,
      id,
      description: insertOrg.description || null,
      logoUrl: null,
      industry: insertOrg.industry || null,
      treasuryAddress: insertOrg.treasuryAddress || null,
      totalBudget: insertOrg.totalBudget || 0,
      createdAt: new Date(),
    };
    this.organizations.set(id, org);
    return org;
  }

  async updateOrganization(
    id: string,
    updates: Partial<Organization>,
  ): Promise<Organization | undefined> {
    const org = this.organizations.get(id);
    if (!org) return undefined;
    const updated = { ...org, ...updates };
    this.organizations.set(id, updated);
    return updated;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    return this.organizations.delete(id);
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAgentsByOrganization(orgId: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.organizationId === orgId,
    );
  }

  async getAgentsByParent(parentId: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.parentAgentId === parentId,
    );
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const agent: Agent = {
      ...insertAgent,
      id,
      description: insertAgent.description || null,
      parentAgentId: insertAgent.parentAgentId || null,
      status: "active",
      personality: insertAgent.personality || null,
      capabilities: insertAgent.capabilities || null,
      walletAddress: insertAgent.walletAddress || null,
      salary: insertAgent.salary || 0,
      performanceScore: 100,
      avatarSeed: insertAgent.avatarSeed || null,
      tier: insertAgent.tier || 0,
      metadata: null,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(
    id: string,
    updates: Partial<Agent>,
  ): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    const updated = { ...agent, ...updates, lastActiveAt: new Date() };
    this.agents.set(id, updated);
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.agents.delete(id);
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByOrganization(orgId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.organizationId === orgId,
    );
  }

  async getTasksByAgent(agentId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedAgentId === agentId,
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      description: insertTask.description || null,
      assignedAgentId: insertTask.assignedAgentId || null,
      createdByAgentId: insertTask.createdByAgentId || null,
      status: "pending",
      priority: insertTask.priority || "medium",
      category: insertTask.category || null,
      dueDate: insertTask.dueDate || null,
      completedAt: null,
      reward: insertTask.reward || 0,
      dependencies: insertTask.dependencies || null,
      output: null,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(
    id: string,
    updates: Partial<Task>,
  ): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...updates };
    if (updates.status === "completed" && !task.completedAt) {
      updated.completedAt = new Date();
    }
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByOrganization(
    orgId: string,
  ): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.organizationId === orgId,
    );
  }

  async createTransaction(
    insertTx: InsertTransaction,
  ): Promise<Transaction> {
    const id = randomUUID();
    const tx: Transaction = {
      ...insertTx,
      id,
      fromAgentId: insertTx.fromAgentId || null,
      toAgentId: insertTx.toAgentId || null,
      description: insertTx.description || null,
      txHash: insertTx.txHash || null,
      status: "pending",
      createdAt: new Date(),
    };
    this.transactions.set(id, tx);
    return tx;
  }

  async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction | undefined> {
    const tx = this.transactions.get(id);
    if (!tx) return undefined;
    const updated = { ...tx, ...updates };
    this.transactions.set(id, updated);
    return updated;
  }

  async getMessage(id: string): Promise<AgentMessage | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByOrganization(
    orgId: string,
  ): Promise<AgentMessage[]> {
    return Array.from(this.messages.values()).filter(
      (msg) => msg.organizationId === orgId,
    );
  }

  async getMessagesByAgent(agentId: string): Promise<AgentMessage[]> {
    return Array.from(this.messages.values()).filter(
      (msg) =>
        msg.fromAgentId === agentId || msg.toAgentId === agentId,
    );
  }

  async createMessage(insertMsg: InsertMessage): Promise<AgentMessage> {
    const id = randomUUID();
    const msg: AgentMessage = {
      ...insertMsg,
      id,
      toAgentId: insertMsg.toAgentId || null,
      messageType: insertMsg.messageType || "direct",
      isRead: false,
      metadata: null,
      createdAt: new Date(),
    };
    this.messages.set(id, msg);
    return msg;
  }

  async markMessageRead(id: string): Promise<boolean> {
    const msg = this.messages.get(id);
    if (!msg) return false;
    msg.isRead = true;
    this.messages.set(id, msg);
    return true;
  }

  async getPerformanceLogs(agentId: string): Promise<PerformanceLog[]> {
    return Array.from(this.performanceLogs.values()).filter(
      (log) => log.agentId === agentId,
    );
  }

  async createPerformanceLog(
    insertLog: InsertPerformanceLog,
  ): Promise<PerformanceLog> {
    const id = randomUUID();
    const log: PerformanceLog = {
      ...insertLog,
      id,
      recordedAt: new Date(),
    };
    this.performanceLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
