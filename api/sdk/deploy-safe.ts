/**
 * Deploy Safe Smart Wallet
 * POST /api/sdk/deploy-safe
 *
 * Body: { address: string, chainId: number }
 *
 * NOTE: This endpoint handles Safe deployment using server-side bundler API key.
 * The BUNDLER_API_KEY is securely stored in environment variables.
 */

import {
  getServerSdk,
  isValidChainId,
  isValidAddress,
} from "../lib/sdk-service";
import type { SupportedChainId } from "@zyfai/sdk";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address, chainId } = req.body;

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({
        error: "Invalid address",
        message: "address must be a valid Ethereum address",
      });
    }

    if (!chainId || !isValidChainId(chainId)) {
      return res.status(400).json({
        error: "Invalid chainId",
        message: "chainId must be one of: 8453, 42161, 9745",
      });
    }

    const sdk = getServerSdk();

    // Deploy the Safe using server-side SDK with bundler API key
    const response = await sdk.deploySafe(address, chainId as SupportedChainId);

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SDK] deploySafe error:", error);
    return res.status(500).json({
      error: "Failed to deploy Safe",
      message: (error as Error).message,
    });
  }
}

