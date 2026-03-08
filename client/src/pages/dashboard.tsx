import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsOverview } from "@/components/stats-overview";
import {
  Activity,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import type { DashboardMetrics } from "@shared/validators";
import { timeAgo } from "@/lib/agent-utils";

interface DashboardProps {
  orgId: string;
}

export default function Dashboard({ orgId }: DashboardProps) {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/organizations", orgId, "dashboard"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          No dashboard data available
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organization overview and key metrics
        </p>
      </div>

      <StatsOverview
        agentCount={metrics.agentCount}
        taskCount={metrics.taskCount}
        completionRate={metrics.completionRate}
        treasuryBalance={metrics.treasuryBalance}
      />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {metrics.performanceTrend.slice(-14).map((point, i) => {
                const height = Math.max(4, (point.score / 100) * 180);
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary/80 rounded-t-sm transition-all duration-300"
                      style={{ height: `${height}px` }}
                      title={`${point.date}: ${point.score}%`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">
                14 days ago
              </span>
              <span className="text-[10px] text-muted-foreground">
                Today
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-48 overflow-auto">
              {metrics.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              ) : (
                metrics.recentActivity.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className="mt-1">
                      {activity.type === "task" && (
                        <Zap className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      {activity.type === "transaction" && (
                        <Activity className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {activity.type === "message" && (
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
