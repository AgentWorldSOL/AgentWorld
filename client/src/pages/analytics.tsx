import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Target,
  Activity,
} from "lucide-react";
import type { AgentAnalytics } from "@shared/validators";

interface AnalyticsPageProps {
  orgId: string;
}

export default function AnalyticsPage({ orgId }: AnalyticsPageProps) {
  const { data: analytics, isLoading } = useQuery<AgentAnalytics>({
    queryKey: ["/api/organizations", orgId, "analytics"],
  });

  const { data: health } = useQuery<{
    score: number;
    factors: { name: string; score: number; weight: number }[];
  }>({
    queryKey: ["/api/organizations", orgId, "health"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          No analytics data available
        </p>
      </div>
    );
  }

  const roleEntries = Object.entries(analytics.roleDistribution).sort(
    (a, b) => b[1] - a[1],
  );
  const statusEntries = Object.entries(analytics.statusDistribution);

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance metrics and organizational insights
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Active Agents
                </p>
                <p className="text-xl font-bold">
                  {analytics.activeAgents}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {analytics.totalAgents}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Completion Rate
                </p>
                <p className="text-xl font-bold">
                  {analytics.taskCompletionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Avg Performance
                </p>
                <p className="text-xl font-bold">
                  {analytics.averagePerformance}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Tasks
                </p>
                <p className="text-xl font-bold">
                  {analytics.totalTasks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Transactions
                </p>
                <p className="text-xl font-bold">
                  {analytics.totalTransactions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Spent
                </p>
                <p className="text-xl font-bold">
                  {analytics.totalSpent.toFixed(2)} SOL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {health && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Organization Health Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="text-4xl font-bold"
                  data-testid="text-health-score"
                >
                  {health.score}
                </div>
                <div className="text-sm text-muted-foreground">
                  / 100
                </div>
              </div>

              <div className="space-y-3">
                {health.factors.map((factor) => (
                  <div key={factor.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs">{factor.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(factor.score)}%
                      </span>
                    </div>
                    <Progress
                      value={factor.score}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roleEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No agents deployed
              </p>
            ) : (
              <div className="space-y-2">
                {roleEntries.map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm truncate">{role}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Agent Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No agents deployed
              </p>
            ) : (
              <div className="space-y-2">
                {statusEntries.map(([status, count]) => {
                  const total = analytics.totalAgents || 1;
                  const percentage = Math.round(
                    (count / total) * 100,
                  );
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm capitalize">
                          {status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-1.5"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {analytics.weeklyActivity.map((day) => {
                const maxTasks = Math.max(
                  ...analytics.weeklyActivity.map((d) => d.tasks),
                  1,
                );
                const height = Math.max(
                  8,
                  (day.tasks / maxTasks) * 100,
                );
                return (
                  <div
                    key={day.day}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary/70 rounded-t-sm"
                      style={{ height: `${height}px` }}
                      title={`${day.tasks} tasks`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
