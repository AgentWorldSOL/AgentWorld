import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

import Dashboard from "@/pages/dashboard";
import AgentsPage from "@/pages/agents";
import HierarchyPage from "@/pages/hierarchy";
import TasksPage from "@/pages/tasks";
import WalletPage from "@/pages/wallet";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

function AppContent() {
  const [orgId, setOrgId] = useState<string | null>(null);

  const createOrg = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/organizations", {
        name: "AgentWorld HQ",
        description: "Primary agent organization",
        industry: "Technology",
        totalBudget: 1000,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setOrgId(data.id);
      localStorage.setItem("agentworld-org-id", data.id);
    },
  });

  useEffect(() => {
    const storedOrgId = localStorage.getItem("agentworld-org-id");
    if (storedOrgId) {
      setOrgId(storedOrgId);
    } else {
      fetch("/api/organizations")
        .then((r) => r.json())
        .then((orgs) => {
          if (orgs.length > 0) {
            setOrgId(orgs[0].id);
            localStorage.setItem("agentworld-org-id", orgs[0].id);
          } else {
            createOrg.mutate();
          }
        })
        .catch(() => {
          createOrg.mutate();
        });
    }
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto rounded-md bg-primary flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground text-xs font-bold">
              AW
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Initializing AgentWorld...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-1 p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/">
                <Dashboard orgId={orgId} />
              </Route>
              <Route path="/agents">
                <AgentsPage orgId={orgId} />
              </Route>
              <Route path="/hierarchy">
                <HierarchyPage orgId={orgId} />
              </Route>
              <Route path="/tasks">
                <TasksPage orgId={orgId} />
              </Route>
              <Route path="/wallet">
                <WalletPage orgId={orgId} />
              </Route>
              <Route path="/analytics">
                <AnalyticsPage orgId={orgId} />
              </Route>
              <Route path="/settings">
                <SettingsPage orgId={orgId} />
              </Route>
              <Route path="/automation">
                <SettingsPage orgId={orgId} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AppContent />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
