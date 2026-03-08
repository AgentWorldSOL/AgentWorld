import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WalletState {
  connected: boolean;
  address: string | null;
  provider: string | null;
  network: string;
}

interface WalletBalance {
  address: string;
  balanceSol: number;
  balanceUsd: number;
  lastUpdated: string;
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    address: null,
    provider: null,
    network: "devnet",
  });

  const connectMutation = useMutation({
    mutationFn: async (address: string) => {
      const res = await apiRequest("POST", "/api/wallet/connect", {
        address,
        provider: "phantom",
      });
      return res.json();
    },
    onSuccess: (data: WalletState) => {
      setWalletState(data);
    },
  });

  const connectPhantom = useCallback(async () => {
    try {
      const phantom = (window as any).solana;
      if (!phantom?.isPhantom) {
        throw new Error(
          "Phantom wallet not found. Please install Phantom browser extension.",
        );
      }

      const response = await phantom.connect();
      const address = response.publicKey.toString();
      await connectMutation.mutateAsync(address);
    } catch (error) {
      throw error;
    }
  }, [connectMutation]);

  const disconnect = useCallback(() => {
    try {
      const phantom = (window as any).solana;
      if (phantom?.isPhantom) {
        phantom.disconnect();
      }
    } catch {}

    setWalletState({
      connected: false,
      address: null,
      provider: null,
      network: "devnet",
    });
  }, []);

  return {
    ...walletState,
    connectPhantom,
    disconnect,
    isConnecting: connectMutation.isPending,
    error: connectMutation.error?.message,
  };
}

export function useWalletBalance(address: string | null) {
  return useQuery<WalletBalance>({
    queryKey: ["/api/wallet/balance", address],
    enabled: !!address,
    refetchInterval: 30000,
  });
}

export function useTransfer() {
  return useMutation({
    mutationFn: async ({
      fromAddress,
      toAddress,
      amount,
    }: {
      fromAddress: string;
      toAddress: string;
      amount: number;
    }) => {
      const res = await apiRequest("POST", "/api/wallet/transfer", {
        fromAddress,
        toAddress,
        amount,
      });
      return res.json();
    },
  });
}
