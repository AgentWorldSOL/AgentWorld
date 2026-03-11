import type { Agent, Organization } from "../../shared/schema";

interface HierarchyNode {
  id: number;
  name: string;
  role: string;
  status: string;
  performance: number;
  depth: number;
  children: HierarchyNode[];
}

interface ExportOptions {
  format: "json" | "csv" | "dot" | "mermaid";
  includeMetrics: boolean;
  maxDepth: number;
}

const DEFAULT_EXPORT: ExportOptions = {
  format: "json",
  includeMetrics: true,
  maxDepth: 10,
};

function buildHierarchyTree(agents: Agent[], parentId: number | null = null, depth = 0, maxDepth = 10): HierarchyNode[] {
  if (depth >= maxDepth) return [];

  return agents
    .filter((a) => a.parentId === parentId)
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role || "member",
      status: agent.status || "idle",
      performance: agent.performance || 0,
      depth,
      children: buildHierarchyTree(agents, agent.id, depth + 1, maxDepth),
    }));
}

function treeToCSV(nodes: HierarchyNode[], rows: string[] = [], parentName = ""): string[] {
  for (const node of nodes) {
    rows.push(
      [
        node.id,
        `"${node.name}"`,
        node.role,
        node.status,
        node.performance,
        node.depth,
        `"${parentName}"`,
        node.children.length,
      ].join(",")
    );
    treeToCSV(node.children, rows, node.name);
  }
  return rows;
}

function treeToDot(nodes: HierarchyNode[], lines: string[] = [], parentId: number | null = null): string[] {
  for (const node of nodes) {
    const label = `${node.name}\\n(${node.role})`;
    const color = node.status === "active" ? "#22c55e" : node.status === "busy" ? "#f59e0b" : "#94a3b8";
    lines.push(`  ${node.id} [label="${label}" fillcolor="${color}" style=filled];`);

    if (parentId !== null) {
      lines.push(`  ${parentId} -> ${node.id};`);
    }

    treeToDot(node.children, lines, node.id);
  }
  return lines;
}

function treeToMermaid(nodes: HierarchyNode[], lines: string[] = [], parentId: number | null = null): string[] {
  for (const node of nodes) {
    const nodeId = `agent${node.id}`;
    lines.push(`  ${nodeId}["${node.name}<br/>${node.role}"]`);

    if (parentId !== null) {
      lines.push(`  agent${parentId} --> ${nodeId}`);
    }

    treeToMermaid(node.children, lines, node.id);
  }
  return lines;
}

export function exportHierarchy(
  org: Organization,
  agents: Agent[],
  options: Partial<ExportOptions> = {}
): string {
  const config = { ...DEFAULT_EXPORT, ...options };
  const rootAgents = agents.filter((a) => !a.parentId || !agents.some((b) => b.id === a.parentId));
  const tree = buildHierarchyTree(agents, null, 0, config.maxDepth);

  switch (config.format) {
    case "json": {
      const output = {
        organization: { id: org.id, name: org.name },
        exportedAt: new Date().toISOString(),
        totalAgents: agents.length,
        hierarchy: tree,
      };
      return JSON.stringify(output, null, 2);
    }

    case "csv": {
      const header = "id,name,role,status,performance,depth,parent,children_count";
      const rows = treeToCSV(tree);
      return [header, ...rows].join("\n");
    }

    case "dot": {
      const lines = treeToDot(tree);
      return [
        `digraph "${org.name}" {`,
        "  rankdir=TB;",
        "  node [shape=box fontname=Arial];",
        ...lines,
        "}",
      ].join("\n");
    }

    case "mermaid": {
      const lines = treeToMermaid(tree);
      return [
        "graph TD",
        ...lines,
      ].join("\n");
    }

    default:
      throw new Error(`Unknown export format: ${config.format}`);
  }
}

export function computeHierarchyStats(agents: Agent[]): {
  totalAgents: number;
  maxDepth: number;
  avgSpan: number;
  rootCount: number;
  leafCount: number;
  activeRate: number;
} {
  const tree = buildHierarchyTree(agents);

  function getMaxDepth(nodes: HierarchyNode[]): number {
    if (nodes.length === 0) return 0;
    return 1 + Math.max(...nodes.map((n) => getMaxDepth(n.children)));
  }

  const spans = agents
    .filter((a) => agents.some((b) => b.parentId === a.id))
    .map((a) => agents.filter((b) => b.parentId === a.id).length);

  const avgSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;
  const activeAgents = agents.filter((a) => a.status === "active" || a.status === "busy").length;

  return {
    totalAgents: agents.length,
    maxDepth: getMaxDepth(tree),
    avgSpan: Math.round(avgSpan * 10) / 10,
    rootCount: agents.filter((a) => !a.parentId).length,
    leafCount: agents.filter((a) => !agents.some((b) => b.parentId === a.id)).length,
    activeRate: agents.length > 0 ? Math.round((activeAgents / agents.length) * 100) : 0,
  };
}
