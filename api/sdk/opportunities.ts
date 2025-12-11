/**
 * Get Yield Opportunities
 * GET /api/sdk/opportunities?chainId=8453&type=safe|degen
 */

import { getServerSdk, isValidChainId } from "../lib/sdk-service";
import type { SupportedChainId } from "@zyfai/sdk";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chainId: chainIdStr, type } = req.query;
    const chainId = parseInt(chainIdStr as string, 10);

    if (!chainId || !isValidChainId(chainId)) {
      return res.status(400).json({
        error: "Invalid chainId",
        message: "chainId must be one of: 8453, 42161, 9745",
      });
    }

    const sdk = getServerSdk();

    if (type === "degen") {
      const response = await sdk.getDegenStrategies(
        chainId as SupportedChainId
      );
      return res.status(200).json(response);
    } else {
      // Default to safe opportunities
      const response = await sdk.getSafeOpportunities(
        chainId as SupportedChainId
      );
      return res.status(200).json(response);
    }
  } catch (error) {
    console.error("[SDK] opportunities error:", error);
    return res.status(500).json({
      error: "Failed to fetch opportunities",
      message: (error as Error).message,
    });
  }
}

