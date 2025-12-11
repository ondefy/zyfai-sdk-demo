/**
 * Get Onchain Earnings
 * GET /api/sdk/earnings?walletAddress=0x...
 *
 * Calculate Earnings
 * POST /api/sdk/earnings?walletAddress=0x...
 */

import { getServerSdk, isValidAddress } from "../lib/sdk-service";

export default async function handler(req: any, res: any) {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || !isValidAddress(walletAddress as string)) {
      return res.status(400).json({
        error: "Invalid walletAddress",
        message: "walletAddress must be a valid Ethereum address",
      });
    }

    const sdk = getServerSdk();

    if (req.method === "GET") {
      // Get cached earnings
      const response = await sdk.getOnchainEarnings(walletAddress as string);
      return res.status(200).json(response);
    } else if (req.method === "POST") {
      // Trigger calculation
      const response = await sdk.calculateOnchainEarnings(
        walletAddress as string
      );
      return res.status(200).json(response);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("[SDK] earnings error:", error);
    return res.status(500).json({
      error: "Failed to fetch/calculate earnings",
      message: (error as Error).message,
    });
  }
}

