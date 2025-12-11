/**
 * Secure API Hook
 *
 * This hook provides secure access to ZyFAI APIs through Vercel serverless functions.
 * API keys are NEVER exposed to the browser - they're stored in Vercel environment variables.
 *
 * USAGE:
 * ```tsx
 * const { executionApi, dataApi, isProxyHealthy } = useSecureApi();
 *
 * // Make execution API calls
 * const protocols = await executionApi.get('/protocols?chainId=8453');
 *
 * // Make data API calls
 * const earnings = await dataApi.get('/usercheck/onchain-earnings?walletAddress=0x...');
 * ```
 */

import { useEffect, useState, useCallback } from "react";

// Use relative paths - works with Vercel dev and production
// The /api routes are handled by Vercel serverless functions
const API_BASE = "";

interface ProxyHealth {
  status: string;
  executionApiConfigured: boolean;
  dataApiConfigured: boolean;
}

interface ApiClient {
  get: <T>(path: string, headers?: Record<string, string>) => Promise<T>;
  post: <T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ) => Promise<T>;
  patch: <T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ) => Promise<T>;
}

async function makeRequest<T>(
  baseUrl: string,
  path: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${baseUrl}/${cleanPath}`;

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
    const errorData = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

export function useSecureApi() {
  const [proxyHealth, setProxyHealth] = useState<ProxyHealth | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check proxy health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        setProxyHealth({
          status: data.status,
          executionApiConfigured: data.config?.executionApiConfigured || false,
          dataApiConfigured: data.config?.dataApiConfigured || false,
        });
      } catch {
        setProxyHealth({
          status: "error",
          executionApiConfigured: false,
          dataApiConfigured: false,
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkHealth();
  }, []);

  // Execution API client (routes to /api/v1/*)
  const executionApi: ApiClient = {
    get: useCallback(
      <T>(path: string, headers?: Record<string, string>) =>
        makeRequest<T>(
          `${API_BASE}/api/proxy/execution`,
          path,
          "GET",
          undefined,
          headers
        ),
      []
    ),
    post: useCallback(
      <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        makeRequest<T>(
          `${API_BASE}/api/proxy/execution`,
          path,
          "POST",
          body,
          headers
        ),
      []
    ),
    patch: useCallback(
      <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        makeRequest<T>(
          `${API_BASE}/api/proxy/execution`,
          path,
          "PATCH",
          body,
          headers
        ),
      []
    ),
  };

  // Data API client (routes to /api/v2/*)
  const dataApi: ApiClient = {
    get: useCallback(
      <T>(path: string, headers?: Record<string, string>) =>
        makeRequest<T>(
          `${API_BASE}/api/proxy/data`,
          path,
          "GET",
          undefined,
          headers
        ),
      []
    ),
    post: useCallback(
      <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        makeRequest<T>(
          `${API_BASE}/api/proxy/data`,
          path,
          "POST",
          body,
          headers
        ),
      []
    ),
    patch: useCallback(
      <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
        makeRequest<T>(
          `${API_BASE}/api/proxy/data`,
          path,
          "PATCH",
          body,
          headers
        ),
      []
    ),
  };

  return {
    executionApi,
    dataApi,
    proxyHealth,
    isProxyHealthy: proxyHealth?.status === "ok",
    isChecking,
  };
}

/**
 * Example usage patterns for B2B integrations:
 *
 * 1. SECURE PATTERN (Vercel Serverless):
 *    - API keys stored in Vercel environment variables
 *    - Frontend calls /api/* routes (same origin)
 *    - Serverless functions add API keys and forward to ZyFAI
 *
 * 2. Data Operations (via proxy):
 *    ```tsx
 *    const { dataApi } = useSecureApi();
 *    const earnings = await dataApi.get(`/usercheck/onchain-earnings?walletAddress=${address}`);
 *    ```
 *
 * 3. Execution Operations (via proxy):
 *    ```tsx
 *    const { executionApi } = useSecureApi();
 *    const protocols = await executionApi.get(`/protocols?chainId=${chainId}`);
 *    ```
 *
 * 4. Wallet Operations (client-side):
 *    - Wallet connection, signing, etc. happen in the browser
 *    - Use wagmi/viem directly for these operations
 */
