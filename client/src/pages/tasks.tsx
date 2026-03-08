import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List } from "lucide-react";
import { TaskBoard } from "@/components/task-board";
import { TaskCreationDialog } from "@/components/task-creation-dialog";
import { useTasks, useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useAgents } from "@/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getPriorityBadgeVariant,
  getTaskStatusBadgeVariant,
  formatTaskStatus,
  timeAgo,
} from "@/lib/agent-utils";
import { useToast } from "@/hooks/use-toast";

interface TasksPageProps {
  orgId: string;
}

export default function TasksPage({ orgId }: TasksPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useTasks(orgId);
  const { data: agents } = useAgents(orgId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const handleCreateTask = (data: any) => {
    createTask.mutate(
      {
        ...data,
        organizationId: orgId,
        assignedAgentId:
          data.assignedAgentId && data.assignedAgentId !== "unassigned"
            ? data.assignedAgentId
            : undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast({ title: "Task created successfully" });
        },
        onError: (error) => {
          toast({
            title: "Failed to create task",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTask.mutate(
      { id: taskId, status: newStatus },
      {
        onSuccess: () => {
          toast({ title: `Task moved to ${formatTaskStatus(newStatus)}` });
        },
      },
    );
  };

  if (tasksLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const agentMap = new Map((agents || []).map((a) => [a.id, a]));

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track agent assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("board")}
              data-testid="button-view-board"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            data-testid="button-create-task"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {viewMode === "board" ? (
        <TaskBoard
          tasks={tasks || []}
          agents={agents || []}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="space-y-2">
          {(tasks || []).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No tasks created yet.
              </p>
            </div>
          ) : (
            (tasks || []).map((task) => {
              const assignedAgent = task.assignedAgentId
                ? agentMap.get(task.assignedAgentId)
                : null;

              return (
                <Card key={task.id} data-testid={`task-list-${task.id}`}>
                  <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <Badge variant={getPriorityBadgeVariant(task.priority)}>
                      {task.priority}
                    </Badge>

                    <Badge
                      variant={getTaskStatusBadgeVariant(task.status)}
                    >
                      {formatTaskStatus(task.status)}
                    </Badge>

                    {assignedAgent && (
                      <span className="text-xs text-muted-foreground">
                        {assignedAgent.name}
                      </span>
                    )}

                    {task.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(task.createdAt)}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <TaskCreationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateTask}
        agents={agents || []}
        isPending={createTask.isPending}
      />
    </div>
  );
}
