import type { Transaction } from "../../shared/schema";

interface FormattedTransaction {
  id: number;
  type: string;
  amount: string;
  amountRaw: number;
  direction: "inbound" | "outbound" | "internal";
  status: string;
  fromLabel: string;
  toLabel: string;
  timestamp: string;
  relativeTime: string;
  signature: string | null;
  explorerUrl: string | null;
}

const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function formatSolAmount(lamports: number, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return `${sol.toFixed(decimals)} SOL`;
}

export function shortenAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getExplorerUrl(
  signature: string,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "mainnet-beta"
): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

function inferDirection(
  tx: Transaction,
  walletAddress?: string
): "inbound" | "outbound" | "internal" {
  if (!walletAddress) return "internal";
  if (tx.toAddress === walletAddress) return "inbound";
  if (tx.fromAddress === walletAddress) return "outbound";
  return "internal";
}

export function formatTransaction(
  tx: Transaction,
  walletAddress?: string
): FormattedTransaction {
  const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
  const date = tx.createdAt ? new Date(tx.createdAt) : new Date();
  const signature = tx.signature || null;

  return {
    id: tx.id,
    type: tx.type || "transfer",
    amount: formatSolAmount(amount),
    amountRaw: amount,
    direction: inferDirection(tx, walletAddress),
    status: tx.status || "confirmed",
    fromLabel: tx.fromAddress ? shortenAddress(tx.fromAddress) : "Unknown",
    toLabel: tx.toAddress ? shortenAddress(tx.toAddress) : "Unknown",
    timestamp: date.toISOString(),
    relativeTime: getRelativeTime(date),
    signature,
    explorerUrl: signature ? getExplorerUrl(signature) : null,
  };
}

export function formatTransactionList(
  transactions: Transaction[],
  walletAddress?: string
): FormattedTransaction[] {
  return transactions
    .map((tx) => formatTransaction(tx, walletAddress))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function computeTransactionSummary(transactions: Transaction[]): {
  totalInbound: number;
  totalOutbound: number;
  netFlow: number;
  transactionCount: number;
  averageAmount: number;
} {
  let totalInbound = 0;
  let totalOutbound = 0;

  for (const tx of transactions) {
    const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
    if (tx.type === "deposit" || tx.type === "receive") {
      totalInbound += amount;
    } else {
      totalOutbound += amount;
    }
  }

  return {
    totalInbound,
    totalOutbound,
    netFlow: totalInbound - totalOutbound,
    transactionCount: transactions.length,
    averageAmount:
      transactions.length > 0
        ? (totalInbound + totalOutbound) / transactions.length
        : 0,
  };
}
