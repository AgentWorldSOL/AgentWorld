import type { Task } from "../../shared/schema";

interface DependencyNode {
  taskId: number;
  dependencies: number[];
  dependents: number[];
  resolved: boolean;
}

interface DependencyGraph {
  nodes: Map<number, DependencyNode>;
  order: number[];
  hasCycle: boolean;
}

export function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const nodes = new Map<number, DependencyNode>();

  for (const task of tasks) {
    nodes.set(task.id, {
      taskId: task.id,
      dependencies: [],
      dependents: [],
      resolved: task.status === "completed",
    });
  }

  for (const task of tasks) {
    if (task.metadata) {
      try {
        const meta = typeof task.metadata === "string"
          ? JSON.parse(task.metadata)
          : task.metadata;

        if (Array.isArray(meta.dependsOn)) {
          const node = nodes.get(task.id);
          if (node) {
            for (const depId of meta.dependsOn) {
              if (nodes.has(depId)) {
                node.dependencies.push(depId);
                const depNode = nodes.get(depId);
                if (depNode) {
                  depNode.dependents.push(task.id);
                }
              }
            }
          }
        }
      } catch {
        continue;
      }
    }
  }

  const order = topologicalSort(nodes);
  const hasCycle = order.length !== nodes.size;

  return { nodes, order, hasCycle };
}

function topologicalSort(nodes: Map<number, DependencyNode>): number[] {
  const visited = new Set<number>();
  const visiting = new Set<number>();
  const order: number[] = [];
  let hasCycle = false;

  function dfs(nodeId: number): void {
    if (hasCycle) return;
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      hasCycle = true;
      return;
    }

    visiting.add(nodeId);
    const node = nodes.get(nodeId);

    if (node) {
      for (const depId of node.dependencies) {
        dfs(depId);
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  }

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return hasCycle ? [] : order;
}

export function getReadyTasks(graph: DependencyGraph): number[] {
  const ready: number[] = [];

  for (const [taskId, node] of graph.nodes) {
    if (node.resolved) continue;

    const allDepsResolved = node.dependencies.every((depId) => {
      const dep = graph.nodes.get(depId);
      return dep?.resolved === true;
    });

    if (allDepsResolved) {
      ready.push(taskId);
    }
  }

  return ready;
}

export function getBlockedTasks(graph: DependencyGraph): Array<{
  taskId: number;
  blockedBy: number[];
}> {
  const blocked: Array<{ taskId: number; blockedBy: number[] }> = [];

  for (const [taskId, node] of graph.nodes) {
    if (node.resolved) continue;

    const unresolvedDeps = node.dependencies.filter((depId) => {
      const dep = graph.nodes.get(depId);
      return dep && !dep.resolved;
    });

    if (unresolvedDeps.length > 0) {
      blocked.push({ taskId, blockedBy: unresolvedDeps });
    }
  }

  return blocked;
}

export function getCriticalPath(graph: DependencyGraph): number[] {
  if (graph.hasCycle || graph.order.length === 0) return [];

  const longestPath = new Map<number, number>();
  const predecessor = new Map<number, number | null>();

  for (const nodeId of graph.order) {
    longestPath.set(nodeId, 0);
    predecessor.set(nodeId, null);
  }

  for (const nodeId of graph.order) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;

    const currentLength = longestPath.get(nodeId) || 0;

    for (const depId of node.dependents) {
      const depLength = longestPath.get(depId) || 0;
      if (currentLength + 1 > depLength) {
        longestPath.set(depId, currentLength + 1);
        predecessor.set(depId, nodeId);
      }
    }
  }

  let endNode = graph.order[0];
  let maxLength = 0;
  for (const [nodeId, length] of longestPath) {
    if (length > maxLength) {
      maxLength = length;
      endNode = nodeId;
    }
  }

  const path: number[] = [];
  let current: number | null = endNode;
  while (current !== null) {
    path.unshift(current);
    current = predecessor.get(current) || null;
  }

  return path;
}
