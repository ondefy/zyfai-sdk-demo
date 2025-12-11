/**
 * Health Check Endpoint
 * Vercel Serverless Function
 *
 * GET /api/health
 * Returns the status of the API configuration
 */

export default function handler(req: any, res: any) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const executionApiConfigured = !!process.env.ZYFAI_API_KEY;
  const dataApiConfigured = !!process.env.ZYFAI_DATA_API_KEY;

  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      executionApiConfigured,
      dataApiConfigured,
      environment: process.env.NODE_ENV || "development",
    },
  });
}
