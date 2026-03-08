import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Agent, InsertAgent } from "@shared/schema";

export function useAgents(orgId: string | undefined) {
  return useQuery<Agent[]>({
    queryKey: ["/api/organizations", orgId, "agents"],
    enabled: !!orgId,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery<Agent>({
    queryKey: ["/api/agents", id],
    enabled: !!id,
  });
}

export function useCreateAgent() {
  return useMutation({
    mutationFn: async (data: InsertAgent) => {
      const res = await apiRequest("POST", "/api/agents", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          variables.organizationId,
          "agents",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          variables.organizationId,
          "hierarchy",
        ],
      });
    },
  });
}

export function useUpdateAgent() {
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Agent> & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/agents/${id}`, updates);
      return res.json();
    },
    onSuccess: (data: Agent) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          data.organizationId,
          "agents",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/agents", data.id],
      });
    },
  });
}

export function useDeleteAgent() {
  return useMutation({
    mutationFn: async ({
      id,
      orgId,
    }: {
      id: string;
      orgId: string;
    }) => {
      await apiRequest("DELETE", `/api/agents/${id}`);
      return { id, orgId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          variables.orgId,
          "agents",
        ],
      });
    },
  });
}

export function useReassignAgent() {
  return useMutation({
    mutationFn: async ({
      agentId,
      newParentId,
    }: {
      agentId: string;
      newParentId: string | null;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/agents/${agentId}/reassign`,
        { newParentId },
      );
      return res.json();
    },
    onSuccess: (data: Agent) => {
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          data.organizationId,
          "agents",
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "/api/organizations",
          data.organizationId,
          "hierarchy",
        ],
      });
    },
  });
}

export function useHierarchy(orgId: string | undefined) {
  return useQuery({
    queryKey: ["/api/organizations", orgId, "hierarchy"],
    enabled: !!orgId,
  });
}

export function useAgentReport(agentId: string | undefined) {
  return useQuery({
    queryKey: ["/api/agents", agentId, "report"],
    enabled: !!agentId,
  });
}
