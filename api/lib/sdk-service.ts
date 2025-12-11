/**
 * Server-Side SDK Service
 *
 * This service initializes and manages the ZyFAI SDK on the server side.
 * All API keys are stored in environment variables and never exposed to the client.
 *
 * SECURITY:
 * - SDK is initialized with API keys from environment variables
 * - All SDK operations go through serverless functions
 * - Client only receives results, never keys
 */

import { ZyfaiSDK, type SupportedChainId } from "@zyfai/sdk";

// Singleton SDK instance (reused across requests in the same serverless function lifecycle)
let sdkInstance: ZyfaiSDK | null = null;

/**
 * Get or create the SDK instance with server-side API keys
 */
export function getServerSdk(): ZyfaiSDK {
  if (sdkInstance) {
    return sdkInstance;
  }

  const apiKey = process.env.ZYFAI_API_KEY;
  const dataApiKey = process.env.ZYFAI_DATA_API_KEY;
  const bundlerApiKey = process.env.BUNDLER_API_KEY;

  if (!apiKey) {
    throw new Error("ZYFAI_API_KEY is not configured");
  }
  if (!dataApiKey) {
    throw new Error("ZYFAI_DATA_API_KEY is not configured");
  }
  if (!bundlerApiKey) {
    throw new Error("BUNDLER_API_KEY is not configured");
  }

  const environment =
    process.env.NODE_ENV === "production" ? "production" : "staging";

  sdkInstance = new ZyfaiSDK({
    apiKey,
    dataApiKey,
    bundlerApiKey,
    environment,
  });

  console.log(`[SDK Service] Initialized SDK with environment: ${environment}`);

  return sdkInstance;
}

/**
 * Check if SDK is properly configured
 */
export function checkSdkConfig(): {
  configured: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!process.env.ZYFAI_API_KEY) missing.push("ZYFAI_API_KEY");
  if (!process.env.ZYFAI_DATA_API_KEY) missing.push("ZYFAI_DATA_API_KEY");
  if (!process.env.BUNDLER_API_KEY) missing.push("BUNDLER_API_KEY");

  return {
    configured: missing.length === 0,
    missing,
  };
}

/**
 * Validate chain ID
 */
export function isValidChainId(chainId: number): chainId is SupportedChainId {
  return [8453, 42161, 9745].includes(chainId);
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

