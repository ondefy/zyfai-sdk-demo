/**
 * Execution API Proxy
 * Vercel Serverless Function
 *
 * Proxies requests to ZyFAI Execution API with the API key added server-side.
 * Route: /api/proxy/execution/* -> https://staging-api.zyf.ai/api/v1/*
 *
 * SECURITY: The ZYFAI_API_KEY is stored in Vercel environment variables
 * and is NEVER exposed to the frontend.
 */

const EXECUTION_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.zyf.ai"
    : "https://staging-api.zyf.ai";

export default async function handler(req: any, res: any) {
  const apiKey = process.env.ZYFAI_API_KEY;

  if (!apiKey) {
    console.error("[Execution Proxy] ZYFAI_API_KEY not configured");
    return res.status(500).json({
      error: "Server configuration error",
      message: "Execution API key not configured",
    });
  }

  // Get the path from the catch-all route
  const { path } = req.query;
  const pathSegments = Array.isArray(path) ? path : [path];
  const targetPath = `/api/v1/${pathSegments.join("/")}`;

  // Build the target URL with query parameters
  const url = new URL(targetPath, EXECUTION_API_URL);

  // Add query parameters (excluding the path param used for routing)
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== "path" && value) {
      url.searchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  console.log(`[Execution Proxy] ${req.method} ${url.toString()}`);

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    };

    // Forward Authorization header if present (for JWT auth)
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    // Make the proxied request
    const response = await fetch(url.toString(), {
      method: req.method || "GET",
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    // Get response data
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Return the response
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("[Execution Proxy] Error:", error);
    return res.status(502).json({
      error: "Proxy error",
      message: "Failed to connect to ZyFAI Execution API",
    });
  }
}

// Handle CORS preflight
export const config = {
  api: {
    bodyParser: true,
  },
};
