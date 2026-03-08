import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListTodo, CheckCircle, Wallet } from "lucide-react";

interface StatsOverviewProps {
  agentCount: number;
  taskCount: number;
  completionRate: number;
  treasuryBalance: number;
}

export function StatsOverview({
  agentCount,
  taskCount,
  completionRate,
  treasuryBalance,
}: StatsOverviewProps) {
  const stats = [
    {
      title: "Active Agents",
      value: agentCount,
      icon: Users,
      description: "Total agents deployed",
      testId: "stat-agents",
    },
    {
      title: "Total Tasks",
      value: taskCount,
      icon: ListTodo,
      description: "Tasks in pipeline",
      testId: "stat-tasks",
    },
    {
      title: "Completion Rate",
      value: `${completionRate.toFixed(1)}%`,
      icon: CheckCircle,
      description: "Task success rate",
      testId: "stat-completion",
    },
    {
      title: "Treasury",
      value: `${treasuryBalance.toFixed(2)} SOL`,
      icon: Wallet,
      description: "Available balance",
      testId: "stat-treasury",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              data-testid={stat.testId}
            >
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
