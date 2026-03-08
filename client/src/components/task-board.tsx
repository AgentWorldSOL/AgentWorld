import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Search as SearchIcon,
  ArrowRight,
} from "lucide-react";
import type { Task, Agent } from "@shared/schema";
import {
  getPriorityBadgeVariant,
  formatTaskStatus,
  timeAgo,
} from "@/lib/agent-utils";

interface TaskBoardProps {
  tasks: Task[];
  agents: Agent[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

const COLUMNS = [
  {
    id: "pending",
    title: "Pending",
    icon: Circle,
    color: "text-amber-500",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Clock,
    color: "text-blue-500",
  },
  {
    id: "review",
    title: "Review",
    icon: SearchIcon,
    color: "text-purple-500",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle,
    color: "text-emerald-500",
  },
];

export function TaskBoard({
  tasks,
  agents,
  onTaskClick,
  onStatusChange,
}: TaskBoardProps) {
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const groupedTasks = COLUMNS.map((column) => ({
    ...column,
    tasks: tasks
      .filter((t) => t.status === column.id)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
        const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
        return pa - pb;
      }),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {groupedTasks.map((column) => (
        <div key={column.id} className="flex flex-col">
          <div className="flex items-center gap-2 mb-3 px-1">
            <column.icon className={`h-4 w-4 ${column.color}`} />
            <h3 className="text-sm font-semibold">{column.title}</h3>
            <Badge variant="secondary" className="ml-auto">
              {column.tasks.length}
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {column.tasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No tasks
                  </p>
                </div>
              ) : (
                column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    agent={
                      task.assignedAgentId
                        ? agentMap.get(task.assignedAgentId)
                        : undefined
                    }
                    onClick={() => onTaskClick?.(task)}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  agent?: Agent;
  onClick?: () => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

function TaskCard({
  task,
  agent,
  onClick,
  onStatusChange,
}: TaskCardProps) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "completed";

  const nextStatus: Record<string, string> = {
    pending: "in_progress",
    in_progress: "review",
    review: "completed",
  };

  return (
    <Card
      className="cursor-pointer"
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-3 space-y-2" onClick={onClick}>
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-sm font-medium leading-tight flex-1">
            {task.title}
          </h4>
          <Badge variant={getPriorityBadgeVariant(task.priority)}>
            {task.priority}
          </Badge>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {task.category && (
          <Badge variant="outline" className="text-[10px]">
            {task.category}
          </Badge>
        )}

        <div className="flex items-center justify-between gap-1 pt-1">
          {agent ? (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {agent.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Unassigned
            </span>
          )}

          {isOverdue && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] text-destructive">
                Overdue
              </span>
            </div>
          )}
        </div>

        {task.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              Due {timeAgo(task.dueDate)}
            </span>
          </div>
        )}

        {task.reward !== null && task.reward > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Reward: {task.reward} SOL
          </div>
        )}

        {nextStatus[task.status] && onStatusChange && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, nextStatus[task.status]);
            }}
            data-testid={`task-advance-${task.id}`}
          >
            Move to {formatTaskStatus(nextStatus[task.status])}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
