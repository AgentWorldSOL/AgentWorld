import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HierarchyTree } from "@/components/hierarchy-tree";
import { GitBranch, Users, Layers, Network } from "lucide-react";

interface HierarchyPageProps {
  orgId: string;
}

interface HierarchyData {
  tree: any[];
  stats: {
    totalAgents: number;
    maxDepth: number;
    averageBranchingFactor: number;
    rootCount: number;
    leafCount: number;
  };
}

export default function HierarchyPage({ orgId }: HierarchyPageProps) {
  const { data, isLoading } = useQuery<HierarchyData>({
    queryKey: ["/api/organizations", orgId, "hierarchy"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-md" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalAgents: 0,
    maxDepth: 0,
    averageBranchingFactor: 0,
    rootCount: 0,
    leafCount: 0,
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Organization Hierarchy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize and manage the agent reporting structure
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Agents</p>
              <p className="text-lg font-bold" data-testid="stat-total-agents">
                {stats.totalAgents}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Max Depth</p>
              <p className="text-lg font-bold" data-testid="stat-max-depth">
                {stats.maxDepth} levels
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Avg. Reports
              </p>
              <p className="text-lg font-bold">
                {stats.averageBranchingFactor.toFixed(1)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Network className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                Leadership
              </p>
              <p className="text-lg font-bold">
                {stats.rootCount} top-level
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Hierarchy View
          </CardTitle>
          <Badge variant="secondary">
            {stats.leafCount} individual contributors
          </Badge>
        </CardHeader>
        <CardContent>
          <HierarchyTree nodes={data?.tree || []} />
        </CardContent>
      </Card>
    </div>
  );
}
