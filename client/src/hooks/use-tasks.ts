import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Task, InsertTask } from "@shared/schema";

export function useTasks(orgId: string | undefined) {
  return useQuery<Task[]>({
    queryKey: ["/api/organizations", orgId, "tasks"],
    enabled: !!orgId,
  });
}

export function useTask(id: string | undefined) {
  return useQuery<Task>({
    queryKey: ["/api/tasks", id],
    enabled: !!id,
  });
}

export function useCreateTask() {
  return useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          variables.organizationId,
          "tasks",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          variables.organizationId,
          "dashboard",
        ],
      });
    },
  });
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Task> & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, updates);
      return res.json();
    },
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          data.organizationId,
          "tasks",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/tasks", data.id],
      });
    },
  });
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: async ({
      id,
      orgId,
    }: {
      id: string;
      orgId: string;
    }) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
      return { id, orgId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          variables.orgId,
          "tasks",
        ],
      });
    },
  });
}

export function useTaskSuggestion(taskId: string | undefined) {
  return useQuery({
    queryKey: ["/api/tasks", taskId, "suggest-assignment"],
    enabled: false,
  });
}
