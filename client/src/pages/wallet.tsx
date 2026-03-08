import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { WalletPanel } from "@/components/wallet-panel";
import { useWallet, useWalletBalance } from "@/hooks/use-wallet";
import type { Transaction } from "@shared/schema";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { timeAgo, formatSolAmount } from "@/lib/agent-utils";

interface WalletPageProps {
  orgId: string;
}

export default function WalletPage({ orgId }: WalletPageProps) {
  const wallet = useWallet();
  const { data: balance } = useWalletBalance(wallet.address);

  const { data: transactions, isLoading: txLoading } = useQuery<
    Transaction[]
  >({
    queryKey: ["/api/organizations", orgId, "transactions"],
  });

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          Wallet & Treasury
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage finances and agent compensation
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <WalletPanel
            connected={wallet.connected}
            address={wallet.address}
            balanceSol={balance?.balanceSol || 0}
            balanceUsd={balance?.balanceUsd || 0}
            network={wallet.network}
            onConnect={wallet.connectPhantom}
            onDisconnect={wallet.disconnect}
            isConnecting={wallet.isConnecting}
            error={wallet.error}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Transaction History
              </CardTitle>
              <Badge variant="secondary">
                {transactions?.length || 0} total
              </Badge>
            </CardHeader>

            <CardContent>
              {txLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 rounded-md" />
                  ))}
                </div>
              ) : (transactions || []).length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Transactions will appear here when agents receive
                    salaries or task rewards.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(transactions || [])
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt!).getTime() -
                        new Date(a.createdAt!).getTime(),
                    )
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                        data-testid={`tx-${tx.id}`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            tx.type === "treasury_deposit" ||
                            tx.type === "task_reward"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "treasury_deposit" ||
                          tx.type === "task_reward" ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {tx.type
                              .split("_")
                              .map(
                                (w) =>
                                  w.charAt(0).toUpperCase() +
                                  w.slice(1),
                              )
                              .join(" ")}
                          </p>
                          {tx.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {tx.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              tx.type === "treasury_deposit" ||
                              tx.type === "task_reward"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {tx.type === "treasury_deposit" ||
                            tx.type === "task_reward"
                              ? "+"
                              : "-"}
                            {formatSolAmount(tx.amount)} SOL
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {tx.createdAt
                              ? timeAgo(tx.createdAt)
                              : ""}
                          </p>
                        </div>

                        <Badge
                          variant={
                            tx.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
