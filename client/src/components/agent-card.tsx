import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, GitBranch, BarChart3 } from "lucide-react";
import type { Agent } from "@shared/schema";
import {
  getAgentInitials,
  getStatusIndicatorClass,
  getStatusLabel,
  generateAvatarGradient,
  getRoleTierLabel,
} from "@/lib/agent-utils";

interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onViewHierarchy?: (agent: Agent) => void;
  onViewReport?: (agent: Agent) => void;
  compact?: boolean;
}

export function AgentCard({
  agent,
  onEdit,
  onDelete,
  onViewHierarchy,
  onViewReport,
  compact = false,
}: AgentCardProps) {
  const avatarGradient = generateAvatarGradient(agent.avatarSeed || agent.name);
  const initials = getAgentInitials(agent.name);
  const statusClass = getStatusIndicatorClass(agent.status);

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-md hover-elevate"
        data-testid={`agent-compact-${agent.id}`}
      >
        <div className="relative">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ background: avatarGradient }}
          >
            {initials}
          </div>
          <div
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusClass}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{agent.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {agent.role}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card data-testid={`agent-card-${agent.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-1 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ background: avatarGradient }}
            >
              {initials}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${statusClass}`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">
              {agent.name}
            </h3>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              data-testid={`agent-menu-${agent.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(agent)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Agent
              </DropdownMenuItem>
            )}
            {onViewReport && (
              <DropdownMenuItem onClick={() => onViewReport(agent)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Report
              </DropdownMenuItem>
            )}
            {onViewHierarchy && (
              <DropdownMenuItem onClick={() => onViewHierarchy(agent)}>
                <GitBranch className="h-4 w-4 mr-2" />
                View in Hierarchy
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(agent)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Agent
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <Badge variant="secondary" data-testid={`badge-status-${agent.id}`}>
            {getStatusLabel(agent.status)}
          </Badge>
          <Badge variant="outline">
            {getRoleTierLabel(agent.tier ?? 0)}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground">
              Performance
            </span>
            <span className="text-xs font-medium">
              {agent.performanceScore ?? 100}%
            </span>
          </div>
          <Progress
            value={agent.performanceScore ?? 100}
            className="h-1.5"
          />
        </div>

        {agent.salary !== null && agent.salary > 0 && (
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground">
              Salary
            </span>
            <span className="text-xs font-medium">
              {agent.salary} SOL/month
            </span>
          </div>
        )}

        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <Badge
                key={cap}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                {cap}
              </Badge>
            ))}
            {agent.capabilities.length > 3 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                +{agent.capabilities.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
