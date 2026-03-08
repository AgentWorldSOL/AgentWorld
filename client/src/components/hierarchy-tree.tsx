import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { HierarchyNode } from "@shared/validators";
import {
  getAgentInitials,
  getStatusIndicatorClass,
  generateAvatarGradient,
} from "@/lib/agent-utils";
import { layoutHierarchy } from "@/lib/hierarchy-utils";

interface HierarchyTreeProps {
  nodes: HierarchyNode[];
  onNodeClick?: (agentId: string) => void;
  selectedNodeId?: string;
}

export function HierarchyTree({
  nodes,
  onNodeClick,
  selectedNodeId,
}: HierarchyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const layout = useMemo(
    () =>
      layoutHierarchy(nodes, {
        nodeWidth: 180,
        nodeHeight: 72,
        horizontalSpacing: 32,
        verticalSpacing: 64,
        padding: 40,
      }),
    [nodes],
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => Math.max(0.3, Math.min(2, prev + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No agents in the hierarchy yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Create agents to build your organization structure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-md border bg-card"
      style={{ height: "500px", cursor: isDragging ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-testid="hierarchy-canvas"
    >
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <Badge variant="secondary" className="text-xs">
          {scale.toFixed(0)}x zoom
        </Badge>
      </div>

      <svg
        width={layout.totalWidth}
        height={layout.totalHeight}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {layout.connections.map((conn) => {
          const midY = (conn.fromY + conn.toY) / 2;
          return (
            <path
              key={`${conn.from}-${conn.to}`}
              d={`M ${conn.fromX} ${conn.fromY} 
                  C ${conn.fromX} ${midY}, 
                    ${conn.toX} ${midY}, 
                    ${conn.toX} ${conn.toY}`}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="2"
              strokeDasharray="none"
            />
          );
        })}

        {layout.layoutNodes.map((node) => {
          const gradient = generateAvatarGradient(
            node.avatarSeed || node.name,
          );
          const initials = getAgentInitials(node.name);
          const isSelected = node.id === selectedNodeId;
          const statusClass = getStatusIndicatorClass(node.status);

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: "pointer" }}
              data-testid={`hierarchy-node-${node.id}`}
            >
              <rect
                width={node.width}
                height={node.height}
                rx="8"
                fill="hsl(var(--card))"
                stroke={
                  isSelected
                    ? "hsl(var(--primary))"
                    : "hsl(var(--border))"
                }
                strokeWidth={isSelected ? "2" : "1"}
              />

              <circle
                cx="28"
                cy={node.height / 2}
                r="14"
                fill="currentColor"
                style={{ color: gradient.includes("hsl") ? undefined : "hsl(220,50%,50%)" }}
              />

              <text
                x="28"
                y={node.height / 2 + 4}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="600"
              >
                {initials}
              </text>

              <text
                x="50"
                y={node.height / 2 - 6}
                fill="hsl(var(--foreground))"
                fontSize="12"
                fontWeight="600"
              >
                {node.name.length > 14
                  ? node.name.slice(0, 14) + "..."
                  : node.name}
              </text>

              <text
                x="50"
                y={node.height / 2 + 10}
                fill="hsl(var(--muted-foreground))"
                fontSize="10"
              >
                {node.role.length > 18
                  ? node.role.slice(0, 18) + "..."
                  : node.role}
              </text>

              {node.totalReports > 0 && (
                <>
                  <rect
                    x={node.width - 30}
                    y="4"
                    width="24"
                    height="16"
                    rx="8"
                    fill="hsl(var(--secondary))"
                  />
                  <text
                    x={node.width - 18}
                    y="15"
                    textAnchor="middle"
                    fill="hsl(var(--secondary-foreground))"
                    fontSize="9"
                    fontWeight="500"
                  >
                    {node.totalReports}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
