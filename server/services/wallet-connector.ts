import { createLogger } from "../utils/logger";
import { generateSecureToken, deriveWalletIdentifier } from "../utils/crypto";

const logger = createLogger("wallet-connector");

interface WalletBalance {
  address: string;
  balanceSol: number;
  balanceUsd: number;
  lastUpdated: Date;
}

interface TransactionRecord {
  signature: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  fee: number;
  status: "confirmed" | "pending" | "failed";
  blockTime: number;
}

interface WalletConnectionState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  network: "mainnet-beta" | "devnet" | "testnet";
}

export class WalletConnector {
  private connections: Map<string, WalletConnectionState> = new Map();
  private balanceCache: Map<string, WalletBalance> = new Map();
  private readonly network: "mainnet-beta" | "devnet" | "testnet";
  private readonly rpcEndpoint: string;

  constructor() {
    this.network = (process.env.SOLANA_NETWORK as any) || "devnet";
    this.rpcEndpoint =
      process.env.SOLANA_RPC_URL ||
      `https://api.${this.network}.solana.com`;

    logger.info("Wallet connector initialized", {
      network: this.network,
    });
  }

  async connectWallet(
    userId: string,
    address: string,
    provider: string = "phantom",
  ): Promise<WalletConnectionState> {
    if (!this.isValidSolanaAddress(address)) {
      throw new Error("Invalid Solana wallet address");
    }

    const state: WalletConnectionState = {
      connected: true,
      address,
      provider,
      network: this.network,
    };

    this.connections.set(userId, state);
    logger.info("Wallet connected", { userId, address: this.maskAddress(address) });

    return state;
  }

  async disconnectWallet(userId: string): Promise<void> {
    this.connections.delete(userId);
    logger.info("Wallet disconnected", { userId });
  }

  getConnectionState(userId: string): WalletConnectionState {
    return (
      this.connections.get(userId) || {
        connected: false,
        address: null,
        provider: null,
        network: this.network,
      }
    );
  }

  async getBalance(address: string): Promise<WalletBalance> {
    const cached = this.balanceCache.get(address);
    if (
      cached &&
      Date.now() - cached.lastUpdated.getTime() < 30_000
    ) {
      return cached;
    }

    try {
      const balance = await this.fetchBalance(address);
      const walletBalance: WalletBalance = {
        address,
        balanceSol: balance,
        balanceUsd: balance * await this.getSolPrice(),
        lastUpdated: new Date(),
      };

      this.balanceCache.set(address, walletBalance);
      return walletBalance;
    } catch (error) {
      logger.error("Failed to fetch balance", {
        address: this.maskAddress(address),
        error: String(error),
      });
      throw error;
    }
  }

  private async fetchBalance(address: string): Promise<number> {
    try {
      const response = await fetch(this.rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address],
        }),
      });

      const data = await response.json();
      if (data.result?.value !== undefined) {
        return data.result.value / 1_000_000_000;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private async getSolPrice(): Promise<number> {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      );
      const data = await response.json();
      return data.solana?.usd || 0;
    } catch {
      return 0;
    }
  }

  async buildTransferInstruction(
    fromAddress: string,
    toAddress: string,
    amountSol: number,
  ): Promise<{
    instruction: Record<string, unknown>;
    estimatedFee: number;
  }> {
    if (!this.isValidSolanaAddress(fromAddress)) {
      throw new Error("Invalid sender address");
    }
    if (!this.isValidSolanaAddress(toAddress)) {
      throw new Error("Invalid recipient address");
    }
    if (amountSol <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    const lamports = Math.round(amountSol * 1_000_000_000);

    const instruction = {
      programId: "11111111111111111111111111111111",
      keys: [
        { pubkey: fromAddress, isSigner: true, isWritable: true },
        { pubkey: toAddress, isSigner: false, isWritable: true },
      ],
      data: {
        type: "transfer",
        lamports,
      },
    };

    return {
      instruction,
      estimatedFee: 0.000005,
    };
  }

  async verifyTransaction(
    signature: string,
  ): Promise<TransactionRecord | null> {
    try {
      const response = await fetch(this.rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [signature, { encoding: "json" }],
        }),
      });

      const data = await response.json();
      if (!data.result) return null;

      const tx = data.result;
      const accountKeys =
        tx.transaction?.message?.accountKeys || [];

      return {
        signature,
        fromAddress: accountKeys[0] || "",
        toAddress: accountKeys[1] || "",
        amount:
          (tx.meta?.postBalances?.[1] - tx.meta?.preBalances?.[1]) /
          1_000_000_000,
        fee: (tx.meta?.fee || 0) / 1_000_000_000,
        status: tx.meta?.err ? "failed" : "confirmed",
        blockTime: tx.blockTime || 0,
      };
    } catch (error) {
      logger.error("Transaction verification failed", {
        signature,
        error: String(error),
      });
      return null;
    }
  }

  generateDepositAddress(
    orgId: string,
    agentId: string,
  ): string {
    return deriveWalletIdentifier(orgId, agentId);
  }

  private isValidSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  private maskAddress(address: string): string {
    if (address.length < 10) return "****";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}

export const walletConnector = new WalletConnector();
