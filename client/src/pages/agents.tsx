import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter } from "lucide-react";
import { AgentCard } from "@/components/agent-card";
import { AgentCreationDialog } from "@/components/agent-creation-dialog";
import { useAgents, useCreateAgent, useDeleteAgent } from "@/hooks/use-agents";
import { AGENT_ROLES, AGENT_STATUSES } from "@shared/constants";
import { filterAgents, sortAgentsByHierarchy } from "@/lib/agent-utils";
import { calculateAgentTier } from "@shared/validators";
import { useToast } from "@/hooks/use-toast";

interface AgentsPageProps {
  orgId: string;
}

export default function AgentsPage({ orgId }: AgentsPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { toast } = useToast();

  const { data: agents, isLoading } = useAgents(orgId);
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();

  const filteredAgents = agents
    ? sortAgentsByHierarchy(
        filterAgents(agents, {
          search,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
        }),
      )
    : [];

  const handleCreateAgent = (data: any) => {
    const tier = calculateAgentTier(data.role, data.parentAgentId || null);
    createAgent.mutate(
      {
        ...data,
        organizationId: orgId,
        parentAgentId:
          data.parentAgentId && data.parentAgentId !== "none"
            ? data.parentAgentId
            : undefined,
        tier,
        avatarSeed: data.name.toLowerCase().replace(/\s/g, ""),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast({ title: "Agent deployed successfully" });
        },
        onError: (error) => {
          toast({
            title: "Failed to create agent",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDeleteAgent = (agent: any) => {
    deleteAgent.mutate(
      { id: agent.id, orgId },
      {
        onSuccess: () => {
          toast({ title: "Agent removed" });
        },
        onError: (error) => {
          toast({
            title: "Failed to delete agent",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your AI agent workforce
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          data-testid="button-create-agent"
        >
          <Plus className="h-4 w-4 mr-2" />
          Deploy Agent
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-agents"
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]" data-testid="filter-role">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {AGENT_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[150px]" data-testid="filter-status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {AGENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-md" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-sm text-muted-foreground">
            {agents?.length === 0
              ? "No agents deployed yet. Create your first agent to get started."
              : "No agents match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={handleDeleteAgent}
            />
          ))}
        </div>
      )}

      <AgentCreationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateAgent}
        existingAgents={agents || []}
        isPending={createAgent.isPending}
      />
    </div>
  );
}
