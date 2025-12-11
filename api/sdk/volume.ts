/**
 * Get Volume
 * GET /api/sdk/volume
 */

import { getServerSdk } from "../lib/sdk-service";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sdk = getServerSdk();
    const response = await sdk.getVolume();

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SDK] getVolume error:", error);
    return res.status(500).json({
      error: "Failed to fetch volume",
      message: (error as Error).message,
    });
  }
}

