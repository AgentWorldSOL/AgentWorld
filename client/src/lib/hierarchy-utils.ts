import type { HierarchyNode } from "@shared/validators";

export interface TreeLayoutNode {
  id: string;
  name: string;
  role: string;
  status: string;
  tier: number;
  avatarSeed: string | null;
  performanceScore: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  children: TreeLayoutNode[];
  totalReports: number;
  depth: number;
  parentId: string | null;
}

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  padding: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalSpacing: 40,
  verticalSpacing: 80,
  padding: 20,
};

export function layoutHierarchy(
  nodes: HierarchyNode[],
  config: Partial<LayoutConfig> = {},
): {
  layoutNodes: TreeLayoutNode[];
  connections: { from: string; to: string; fromX: number; fromY: number; toX: number; toY: number }[];
  totalWidth: number;
  totalHeight: number;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const layoutNodes: TreeLayoutNode[] = [];
  const connections: { from: string; to: string; fromX: number; fromY: number; toX: number; toY: number }[] = [];

  if (nodes.length === 0) {
    return { layoutNodes, connections, totalWidth: 0, totalHeight: 0 };
  }

  let maxX = 0;
  let maxY = 0;

  function computeSubtreeWidth(node: HierarchyNode): number {
    if (node.children.length === 0) {
      return cfg.nodeWidth;
    }

    const childrenTotalWidth = node.children.reduce(
      (sum, child) => sum + computeSubtreeWidth(child),
      0,
    );

    const gapsBetweenChildren =
      (node.children.length - 1) * cfg.horizontalSpacing;

    return Math.max(
      cfg.nodeWidth,
      childrenTotalWidth + gapsBetweenChildren,
    );
  }

  function positionNode(
    node: HierarchyNode,
    x: number,
    y: number,
    parentId: string | null,
  ): TreeLayoutNode {
    const subtreeWidth = computeSubtreeWidth(node);
    const nodeX = x + subtreeWidth / 2 - cfg.nodeWidth / 2;
    const nodeY = y;

    const layoutNode: TreeLayoutNode = {
      id: node.agent.id,
      name: node.agent.name,
      role: node.agent.role,
      status: node.agent.status,
      tier: node.agent.tier,
      avatarSeed: node.agent.avatarSeed,
      performanceScore: node.agent.performanceScore,
      x: nodeX,
      y: nodeY,
      width: cfg.nodeWidth,
      height: cfg.nodeHeight,
      children: [],
      totalReports: node.totalReports,
      depth: node.depth,
      parentId,
    };

    layoutNodes.push(layoutNode);

    maxX = Math.max(maxX, nodeX + cfg.nodeWidth);
    maxY = Math.max(maxY, nodeY + cfg.nodeHeight);

    if (node.children.length > 0) {
      let childX = x;
      const childY = y + cfg.nodeHeight + cfg.verticalSpacing;

      for (const child of node.children) {
        const childSubtreeWidth = computeSubtreeWidth(child);
        const childLayoutNode = positionNode(
          child,
          childX,
          childY,
          node.agent.id,
        );

        layoutNode.children.push(childLayoutNode);

        const fromCenterX = nodeX + cfg.nodeWidth / 2;
        const fromBottomY = nodeY + cfg.nodeHeight;
        const toCenterX = childLayoutNode.x + cfg.nodeWidth / 2;
        const toTopY = childLayoutNode.y;

        connections.push({
          from: node.agent.id,
          to: child.agent.id,
          fromX: fromCenterX,
          fromY: fromBottomY,
          toX: toCenterX,
          toY: toTopY,
        });

        childX += childSubtreeWidth + cfg.horizontalSpacing;
      }
    }

    return layoutNode;
  }

  let startX = cfg.padding;
  for (const rootNode of nodes) {
    positionNode(rootNode, startX, cfg.padding, null);
    startX += computeSubtreeWidth(rootNode) + cfg.horizontalSpacing;
  }

  return {
    layoutNodes,
    connections,
    totalWidth: maxX + cfg.padding,
    totalHeight: maxY + cfg.padding,
  };
}

export function flattenTree(nodes: TreeLayoutNode[]): TreeLayoutNode[] {
  const result: TreeLayoutNode[] = [];

  function traverse(node: TreeLayoutNode) {
    result.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return result;
}

export function findNodeById(
  nodes: TreeLayoutNode[],
  id: string,
): TreeLayoutNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function getDepthRange(
  nodes: HierarchyNode[],
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  function traverse(node: HierarchyNode) {
    min = Math.min(min, node.depth);
    max = Math.max(max, node.depth);
    for (const child of node.children) {
      traverse(child);
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  if (min === Infinity) return { min: 0, max: 0 };
  return { min, max };
}
