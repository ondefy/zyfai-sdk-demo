/**
 * Secure SDK Hook
 *
 * This hook provides secure access to ZyFAI SDK operations through serverless functions.
 * All API keys (including BUNDLER_API_KEY) are stored server-side.
 *
 * USAGE:
 * ```tsx
 * const { sdk, isReady, health } = useSecureSdk();
 *
 * // Fetch protocols
 * const protocols = await sdk.getProtocols(8453);
 *
 * // Get smart wallet address
 * const wallet = await sdk.getSmartWallet(address, 8453);
 *
 * // Deploy Safe (uses server-side bundler API key)
 * const result = await sdk.deploySafe(address, 8453);
 * ```
 */

import { useEffect, useState, useCallback } from "react";
import type { SupportedChainId, Protocol } from "@zyfai/sdk";

// =============================================================================
// Types
// =============================================================================

interface SdkHealth {
  status: "ok" | "partial" | "error";
  executionApiConfigured: boolean;
  dataApiConfigured: boolean;
  bundlerApiConfigured: boolean;
}

interface SmartWalletResponse {
  address: string;
  isDeployed: boolean;
}

interface DeploySafeResponse {
  success: boolean;
  safeAddress: string;
  txHash: string;
  status: string;
}

interface ProtocolsResponse {
  protocols: Protocol[];
}

interface PositionsResponse {
  positions: unknown[];
}

interface TVLResponse {
  totalTvl: number;
  byChain?: Record<string, number>;
}

interface VolumeResponse {
  volumeInUSD: number;
}

interface EarningsResponse {
  data: {
    totalEarnings: number;
    currentEarnings: number;
    lifetimeEarnings: number;
    currentEarningsByChain?: Record<string, number>;
    lastCheckTimestamp?: string;
  };
}

interface OpportunitiesResponse {
  data: unknown[];
}

// =============================================================================
// API Request Helper
// =============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Hook
// =============================================================================

export function useSecureSdk() {
  const [health, setHealth] = useState<SdkHealth | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setHealth({
          status: data.status,
          executionApiConfigured: data.config?.executionApiConfigured || false,
          dataApiConfigured: data.config?.dataApiConfigured || false,
          bundlerApiConfigured: data.config?.bundlerApiConfigured || false,
        });
      } catch {
        setHealth({
          status: "error",
          executionApiConfigured: false,
          dataApiConfigured: false,
          bundlerApiConfigured: false,
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkHealth();
  }, []);

  // =============================================================================
  // SDK Methods (all go through serverless functions)
  // =============================================================================

  /**
   * Get available protocols for a chain
   */
  const getProtocols = useCallback(
    async (chainId: SupportedChainId): Promise<ProtocolsResponse> => {
      return apiRequest(`/api/sdk/protocols?chainId=${chainId}`);
    },
    []
  );

  /**
   * Get user positions
   */
  const getPositions = useCallback(
    async (
      address: string,
      chainId: SupportedChainId
    ): Promise<PositionsResponse> => {
      return apiRequest(
        `/api/sdk/positions?address=${address}&chainId=${chainId}`
      );
    },
    []
  );

  /**
   * Get smart wallet address (deterministic)
   */
  const getSmartWallet = useCallback(
    async (
      address: string,
      chainId: SupportedChainId
    ): Promise<SmartWalletResponse> => {
      return apiRequest(
        `/api/sdk/smart-wallet?address=${address}&chainId=${chainId}`
      );
    },
    []
  );

  /**
   * Deploy Safe smart wallet
   * Uses server-side BUNDLER_API_KEY
   */
  const deploySafe = useCallback(
    async (
      address: string,
      chainId: SupportedChainId
    ): Promise<DeploySafeResponse> => {
      return apiRequest("/api/sdk/deploy-safe", {
        method: "POST",
        body: JSON.stringify({ address, chainId }),
      });
    },
    []
  );

  /**
   * Get platform TVL
   */
  const getTVL = useCallback(async (): Promise<TVLResponse> => {
    return apiRequest("/api/sdk/tvl");
  }, []);

  /**
   * Get platform volume
   */
  const getVolume = useCallback(async (): Promise<VolumeResponse> => {
    return apiRequest("/api/sdk/volume");
  }, []);

  /**
   * Get onchain earnings for a wallet
   */
  const getEarnings = useCallback(
    async (walletAddress: string): Promise<EarningsResponse> => {
      return apiRequest(`/api/sdk/earnings?walletAddress=${walletAddress}`);
    },
    []
  );

  /**
   * Trigger earnings calculation for a wallet
   */
  const calculateEarnings = useCallback(
    async (walletAddress: string): Promise<EarningsResponse> => {
      return apiRequest(`/api/sdk/earnings?walletAddress=${walletAddress}`, {
        method: "POST",
      });
    },
    []
  );

  /**
   * Get safe yield opportunities
   */
  const getSafeOpportunities = useCallback(
    async (chainId: SupportedChainId): Promise<OpportunitiesResponse> => {
      return apiRequest(`/api/sdk/opportunities?chainId=${chainId}&type=safe`);
    },
    []
  );

  /**
   * Get degen yield strategies
   */
  const getDegenStrategies = useCallback(
    async (chainId: SupportedChainId): Promise<OpportunitiesResponse> => {
      return apiRequest(`/api/sdk/opportunities?chainId=${chainId}&type=degen`);
    },
    []
  );

  // =============================================================================
  // Return SDK interface
  // =============================================================================

  const sdk = {
    // Read operations
    getProtocols,
    getPositions,
    getSmartWallet,
    getTVL,
    getVolume,
    getEarnings,
    calculateEarnings,
    getSafeOpportunities,
    getDegenStrategies,

    // Write operations (use server-side bundler key)
    deploySafe,
  };

  return {
    sdk,
    health,
    isReady: health?.status === "ok",
    isChecking,
  };
}

/**
 * SECURITY NOTES FOR B2B CLIENTS:
 *
 * 1. ALL API keys are stored server-side in Vercel environment variables:
 *    - ZYFAI_API_KEY (Execution API)
 *    - ZYFAI_DATA_API_KEY (Data API)
 *    - BUNDLER_API_KEY (Pimlico bundler for Safe operations)
 *
 * 2. The frontend NEVER sees any API keys
 *
 * 3. All SDK operations go through /api/sdk/* serverless functions
 *
 * 4. The SDK is initialized SERVER-SIDE with full credentials
 *
 * 5. For operations requiring wallet signing (deposits, withdraws, session keys):
 *    - These would need additional endpoints that prepare transactions
 *    - The frontend signs with the user's wallet
 *    - The signed transaction is sent back to be broadcast
 */

