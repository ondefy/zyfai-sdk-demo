/**
 * Get TVL (Total Value Locked)
 * GET /api/sdk/tvl
 */

import { getServerSdk } from "../lib/sdk-service";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sdk = getServerSdk();
    const response = await sdk.getTVL();

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SDK] getTVL error:", error);
    return res.status(500).json({
      error: "Failed to fetch TVL",
      message: (error as Error).message,
    });
  }
}

