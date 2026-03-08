import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Shield, Zap, Globe } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SettingsPageProps {
  orgId: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export default function SettingsPage({ orgId }: SettingsPageProps) {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const { data: rules } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation/rules"],
  });

  const toggleRule = useMutation({
    mutationFn: async ({
      ruleId,
      enabled,
    }: {
      ruleId: string;
      enabled: boolean;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/automation/rules/${ruleId}`,
        { enabled },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/automation/rules"],
      });
      toast({ title: "Automation rule updated" });
    },
  });

  const { data: recommendations } = useQuery<{
    recommendedRoles: string[];
  }>({
    queryKey: ["/api/organizations", orgId, "recommendations"],
  });

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your workspace and automation rules
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Network Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Solana Network</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Devnet</Badge>
                <span className="text-xs text-muted-foreground">
                  Switch to mainnet for production
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>RPC Endpoint</Label>
              <Input
                value="https://api.devnet.solana.com"
                readOnly
                className="text-xs font-mono"
                data-testid="input-rpc-endpoint"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automation Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(rules || []).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Trigger: {rule.trigger.replace(/_/g, " ")} | Action:{" "}
                    {rule.action.replace(/_/g, " ")}
                  </p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) =>
                    toggleRule.mutate({
                      ruleId: rule.id,
                      enabled: checked,
                    })
                  }
                  data-testid={`switch-rule-${rule.id}`}
                />
              </div>
            ))}

            {(!rules || rules.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No automation rules configured
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Recommended Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations?.recommendedRoles &&
            recommendations.recommendedRoles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Based on your organization structure, consider
                  adding these roles:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendations.recommendedRoles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Your organization structure looks complete
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
