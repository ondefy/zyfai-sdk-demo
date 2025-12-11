/**
 * Data API Proxy
 * Vercel Serverless Function
 *
 * Proxies requests to ZyFAI Data API with the API key added server-side.
 * Route: /api/proxy/data/* -> https://staging-defiapi.zyf.ai/api/v2/*
 *
 * SECURITY: The ZYFAI_DATA_API_KEY is stored in Vercel environment variables
 * and is NEVER exposed to the frontend.
 */

const DATA_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://defiapi.zyf.ai"
    : "https://staging-defiapi.zyf.ai";

export default async function handler(req: any, res: any) {
  const apiKey = process.env.ZYFAI_DATA_API_KEY;

  if (!apiKey) {
    console.error("[Data Proxy] ZYFAI_DATA_API_KEY not configured");
    return res.status(500).json({
      error: "Server configuration error",
      message: "Data API key not configured",
    });
  }

  // Get the path from the catch-all route
  const { path } = req.query;
  const pathSegments = Array.isArray(path) ? path : [path];
  const targetPath = `/api/v2/${pathSegments.join("/")}`;

  // Build the target URL with query parameters
  const url = new URL(targetPath, DATA_API_URL);

  // Add query parameters (excluding the path param used for routing)
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== "path" && value) {
      url.searchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  console.log(`[Data Proxy] ${req.method} ${url.toString()}`);

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    };

    // Forward Authorization header if present
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
    console.error("[Data Proxy] Error:", error);
    return res.status(502).json({
      error: "Proxy error",
      message: "Failed to connect to ZyFAI Data API",
    });
  }
}

// Handle CORS preflight
export const config = {
  api: {
    bodyParser: true,
  },
};
