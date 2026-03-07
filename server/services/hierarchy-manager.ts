import type { Agent } from "@shared/schema";
import type { HierarchyNode } from "@shared/validators";
import { createLogger } from "../utils/logger";

const logger = createLogger("hierarchy-manager");

export class HierarchyManager {
  private agentIndex: Map<string, Agent> = new Map();
  private childrenIndex: Map<string, string[]> = new Map();

  loadAgents(agents: Agent[]): void {
    this.agentIndex.clear();
    this.childrenIndex.clear();

    for (const agent of agents) {
      this.agentIndex.set(agent.id, agent);
    }

    for (const agent of agents) {
      const parentId = agent.parentAgentId || "__root__";
      if (!this.childrenIndex.has(parentId)) {
        this.childrenIndex.set(parentId, []);
      }
      this.childrenIndex.get(parentId)!.push(agent.id);
    }

    logger.info("Hierarchy loaded", {
      totalAgents: agents.length,
      rootAgents: (this.childrenIndex.get("__root__") || []).length,
    });
  }

  buildTree(organizationAgents: Agent[]): HierarchyNode[] {
    this.loadAgents(organizationAgents);
    const rootAgentIds = this.childrenIndex.get("__root__") || [];
    return rootAgentIds
      .map((id) => this.buildNode(id, 0))
      .filter((node): node is HierarchyNode => node !== null)
      .sort((a, b) => (a.agent.tier ?? 0) - (b.agent.tier ?? 0));
  }

  private buildNode(
    agentId: string,
    depth: number,
  ): HierarchyNode | null {
    const agent = this.agentIndex.get(agentId);
    if (!agent) return null;

    const childIds = this.childrenIndex.get(agentId) || [];
    const children = childIds
      .map((cid) => this.buildNode(cid, depth + 1))
      .filter((n): n is HierarchyNode => n !== null);

    const totalReports = children.reduce(
      (sum, c) => sum + 1 + c.totalReports,
      0,
    );

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        tier: agent.tier ?? 0,
        avatarSeed: agent.avatarSeed,
        performanceScore: agent.performanceScore,
      },
      children,
      depth,
      totalReports,
    };
  }

  getDirectReports(agentId: string): Agent[] {
    const childIds = this.childrenIndex.get(agentId) || [];
    return childIds
      .map((id) => this.agentIndex.get(id))
      .filter((a): a is Agent => a !== undefined);
  }

  getAllSubordinates(agentId: string): Agent[] {
    const result: Agent[] = [];
    const stack = [agentId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const childIds = this.childrenIndex.get(currentId) || [];
      for (const childId of childIds) {
        const agent = this.agentIndex.get(childId);
        if (agent) {
          result.push(agent);
          stack.push(childId);
        }
      }
    }

    return result;
  }

  getChainOfCommand(agentId: string): Agent[] {
    const chain: Agent[] = [];
    let currentId: string | null = agentId;

    while (currentId) {
      const agent = this.agentIndex.get(currentId);
      if (!agent) break;
      chain.push(agent);
      currentId = agent.parentAgentId;
    }

    return chain.reverse();
  }

  getMaxDepth(): number {
    let maxDepth = 0;
    const rootIds = this.childrenIndex.get("__root__") || [];

    const traverse = (id: string, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      const childIds = this.childrenIndex.get(id) || [];
      for (const childId of childIds) {
        traverse(childId, depth + 1);
      }
    };

    for (const rootId of rootIds) {
      traverse(rootId, 0);
    }

    return maxDepth;
  }

  validateReassignment(
    agentId: string,
    newParentId: string | null,
  ): { valid: boolean; reason?: string } {
    if (newParentId === null) {
      return { valid: true };
    }

    if (agentId === newParentId) {
      return { valid: false, reason: "Agent cannot be its own parent" };
    }

    const subordinates = this.getAllSubordinates(agentId);
    if (subordinates.some((s) => s.id === newParentId)) {
      return {
        valid: false,
        reason: "Cannot assign a subordinate as parent (circular reference)",
      };
    }

    return { valid: true };
  }

  getOrganizationStats(agents: Agent[]): {
    totalAgents: number;
    maxDepth: number;
    averageBranchingFactor: number;
    rootCount: number;
    leafCount: number;
  } {
    this.loadAgents(agents);

    const rootCount = (this.childrenIndex.get("__root__") || []).length;
    let leafCount = 0;
    let totalBranching = 0;
    let nonLeafCount = 0;

    for (const agent of agents) {
      const childIds = this.childrenIndex.get(agent.id) || [];
      if (childIds.length === 0) {
        leafCount++;
      } else {
        totalBranching += childIds.length;
        nonLeafCount++;
      }
    }

    return {
      totalAgents: agents.length,
      maxDepth: this.getMaxDepth(),
      averageBranchingFactor:
        nonLeafCount > 0 ? totalBranching / nonLeafCount : 0,
      rootCount,
      leafCount,
    };
  }
}

export const hierarchyManager = new HierarchyManager();
