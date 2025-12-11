/**
 * Get Available Protocols
 * GET /api/sdk/protocols?chainId=8453
 */

import { getServerSdk, isValidChainId } from "../lib/sdk-service";
import type { SupportedChainId } from "@zyfai/sdk";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chainId = parseInt(req.query.chainId as string, 10);

    if (!chainId || !isValidChainId(chainId)) {
      return res.status(400).json({
        error: "Invalid chainId",
        message: "chainId must be one of: 8453, 42161, 9745",
      });
    }

    const sdk = getServerSdk();
    const response = await sdk.getAvailableProtocols(
      chainId as SupportedChainId
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SDK] getAvailableProtocols error:", error);
    return res.status(500).json({
      error: "Failed to fetch protocols",
      message: (error as Error).message,
    });
  }
}

