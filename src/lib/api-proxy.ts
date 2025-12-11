/**
 * API Proxy Client
 *
 * This client routes all ZyFAI API calls through Vercel serverless functions.
 * The serverless functions add the API keys server-side, so they're never exposed to the browser.
 *
 * SECURITY:
 * - API keys are stored in Vercel environment variables
 * - Frontend uses relative /api/* paths (same origin)
 * - Serverless functions add authentication before forwarding
 */

export interface ProxyRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make a request to the Execution API via serverless proxy
 * Routes: /api/proxy/execution/* -> ZyFAI Execution API /api/v1/*
 */
export async function executionApiRequest<T>(
  path: string,
  options: ProxyRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `/api/proxy/execution/${cleanPath}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Make a request to the Data API via serverless proxy
 * Routes: /api/proxy/data/* -> ZyFAI Data API /api/v2/*
 */
export async function dataApiRequest<T>(
  path: string,
  options: ProxyRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `/api/proxy/data/${cleanPath}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Check if the serverless proxy is healthy and configured
 */
export async function checkProxyHealth(): Promise<{
  status: string;
  executionApiConfigured: boolean;
  dataApiConfigured: boolean;
}> {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    return {
      status: data.status,
      executionApiConfigured: data.config?.executionApiConfigured || false,
      dataApiConfigured: data.config?.dataApiConfigured || false,
    };
  } catch {
    return {
      status: "error",
      executionApiConfigured: false,
      dataApiConfigured: false,
    };
  }
}
