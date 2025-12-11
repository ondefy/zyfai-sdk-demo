/**
 * Get User Positions
 * GET /api/sdk/positions?address=0x...&chainId=8453
 */

import {
  getServerSdk,
  isValidChainId,
  isValidAddress,
} from "../lib/sdk-service";
import type { SupportedChainId } from "@zyfai/sdk";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address, chainId: chainIdStr } = req.query;
    const chainId = parseInt(chainIdStr as string, 10);

    if (!address || !isValidAddress(address as string)) {
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
    const response = await sdk.getPositions(
      address as string,
      chainId as SupportedChainId
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SDK] getPositions error:", error);
    return res.status(500).json({
      error: "Failed to fetch positions",
      message: (error as Error).message,
    });
  }
}

