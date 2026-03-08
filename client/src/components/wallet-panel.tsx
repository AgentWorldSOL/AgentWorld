import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { truncateAddress } from "@/lib/agent-utils";
import { useToast } from "@/hooks/use-toast";

interface WalletPanelProps {
  connected: boolean;
  address: string | null;
  balanceSol: number;
  balanceUsd: number;
  network: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  error?: string;
}

export function WalletPanel({
  connected,
  address,
  balanceSol,
  balanceUsd,
  network,
  onConnect,
  onDisconnect,
  isConnecting,
  error,
}: WalletPanelProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast({ title: "Address copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Connect Wallet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Connect your Phantom wallet to manage agent finances,
              distribute salaries, and track treasury operations.
            </p>
          </div>
          <Button
            onClick={onConnect}
            disabled={isConnecting}
            data-testid="button-connect-wallet"
          >
            {isConnecting ? "Connecting..." : "Connect Phantom"}
          </Button>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          Wallet Connected
        </CardTitle>
        <Badge variant="secondary">{network}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Address</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded-md flex-1">
              {address ? truncateAddress(address) : "..."}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={copyAddress}
              data-testid="button-copy-address"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {address && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  window.open(
                    `https://solscan.io/account/${address}`,
                    "_blank",
                  )
                }
                data-testid="button-view-explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">SOL Balance</p>
            <p
              className="text-xl font-bold mt-1"
              data-testid="text-balance-sol"
            >
              {balanceSol.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">USD Value</p>
            <p
              className="text-xl font-bold mt-1"
              data-testid="text-balance-usd"
            >
              ${balanceUsd.toFixed(2)}
            </p>
          </div>
        </div>

        <Separator />

        <Button
          variant="outline"
          className="w-full"
          onClick={onDisconnect}
          data-testid="button-disconnect-wallet"
        >
          Disconnect Wallet
        </Button>
      </CardContent>
    </Card>
  );
}
