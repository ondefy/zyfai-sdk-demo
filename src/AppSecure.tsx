/**
 * ZyFAI SDK Demo - Secure Implementation
 *
 * This implementation demonstrates the SECURE pattern for B2B integrations:
 * - API keys are stored ONLY on the backend
 * - All API calls go through Vercel serverless functions
 * - The frontend NEVER sees the actual API keys
 *
 * ARCHITECTURE:
 * ┌─────────────┐      ┌─────────────────┐      ┌─────────────────────┐
 * │   Frontend  │ ───► │  Your Backend   │ ───► │  ZyFAI APIs         │
 * │  (Browser)  │      │  (Adds API Key) │      │  (Execution + Data) │
 * └─────────────┘      └─────────────────┘      └─────────────────────┘
 */

import { useAppKit } from "@reown/appkit/react";
import type { Protocol, Position, SupportedChainId } from "@zyfai/sdk";
import { useEffect, useState } from "react";
import {
  useAccount,
  useDisconnect,
  useWalletClient,
  usePublicClient,
} from "wagmi";
import { useSecureApi } from "./hooks/useSecureApi";
import "./App.css";

// =============================================================================
// Constants
// =============================================================================

const CHAIN_OPTIONS: { id: SupportedChainId; label: string }[] = [
  { id: 8453, label: "Base (8453)" },
  { id: 42161, label: "Arbitrum (42161)" },
  { id: 9745, label: "Plasma (9745)" },
];

const TOKEN_PRESETS: Record<
  SupportedChainId,
  { symbol: string; address: string }[]
> = {
  8453: [
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  ],
  42161: [
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  ],
  9745: [
    { symbol: "USDT", address: "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb" },
  ],
};

const isSupportedChain = (value: number): value is SupportedChainId =>
  CHAIN_OPTIONS.some((chain) => chain.id === value);

const DEFAULT_CHAIN: SupportedChainId = 8453;

// =============================================================================
// Helpers
// =============================================================================

const truncate = (value?: string, visible = 8) => {
  if (!value) return "";
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}…${value.slice(-4)}`;
};

const formatUsd = (value?: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === undefined || num === null || isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
};

const formatChainName = (chainId: string | number) => {
  const id = String(chainId);
  switch (id) {
    case "8453":
      return "Base";
    case "42161":
      return "Arbitrum";
    case "9745":
      return "Plasma";
    default:
      return `Chain ${id}`;
  }
};

// =============================================================================
// Types for API Responses
// =============================================================================

interface SmartWalletResponse {
  address: string;
  isDeployed: boolean;
}

interface UserDetailsResponse {
  user: {
    id: string;
    address: string;
    smartWallet?: string;
    chains?: number[];
    strategy?: string;
    hasActiveSessionKey?: boolean;
  };
}

interface TVLResponse {
  totalTvl: number;
  byChain?: Record<string, number>;
}

interface VolumeResponse {
  volumeInUSD: number;
}

interface OnchainEarningsResponse {
  data: {
    totalEarnings: number;
    currentEarnings: number;
    lifetimeEarnings: number;
    currentEarningsByChain?: Record<string, number>;
  };
}

type PositionBundle = Position & { positions?: Position["positions"] };

// =============================================================================
// Main App Component
// =============================================================================

function AppSecure() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  // Secure API hook - all calls go through Vercel serverless functions
  const { executionApi, dataApi, proxyHealth, isProxyHealthy, isChecking } =
    useSecureApi();

  const [status, setStatus] = useState("Connect a wallet to begin");
  const [selectedChain, setSelectedChain] =
    useState<SupportedChainId>(DEFAULT_CHAIN);
  const [isBusy, setIsBusy] = useState(false);

  // State for fetched data
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [positions, setPositions] = useState<PositionBundle[]>([]);
  const [walletInfo, setWalletInfo] = useState<SmartWalletResponse | null>(
    null
  );
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(
    null
  );
  const [tvlData, setTvlData] = useState<TVLResponse | null>(null);
  const [volumeData, setVolumeData] = useState<VolumeResponse | null>(null);
  const [onchainEarnings, setOnchainEarnings] =
    useState<OnchainEarningsResponse | null>(null);

  // Deposit state
  const [depositToken, setDepositToken] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  // Check proxy health on mount
  useEffect(() => {
    if (!isChecking && !isProxyHealthy) {
      setStatus(
        "⚠️ API proxy not available. Check Vercel environment variables."
      );
    }
  }, [isChecking, isProxyHealthy]);

  // =============================================================================
  // API Calls via Secure Proxy
  // =============================================================================

  const fetchProtocols = async () => {
    if (!isProxyHealthy) {
      setStatus("API proxy not available");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching available protocols via secure proxy…");

      // API call goes through YOUR backend, which adds the API key
      const response = await executionApi.get<{ protocols: Protocol[] }>(
        `/protocols?chainId=${selectedChain}`
      );

      setProtocols(response.protocols);
      setStatus(
        `✅ Loaded ${response.protocols.length} protocols (via secure proxy)`
      );
    } catch (error) {
      setStatus(`❌ Failed to load protocols: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchPositions = async () => {
    if (!isProxyHealthy || !address) return;
    try {
      setIsBusy(true);
      setStatus("Fetching positions via secure proxy…");

      const response = await executionApi.get<{ positions: PositionBundle[] }>(
        `/position/${address}?chainId=${selectedChain}`
      );

      setPositions(response.positions ?? []);
      setStatus(`✅ Loaded positions (via secure proxy)`);
    } catch (error) {
      setStatus(`❌ Failed to load positions: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const resolveSmartWallet = async () => {
    if (!isProxyHealthy || !address) return;
    try {
      setIsBusy(true);
      setStatus("Resolving Smart Wallet address via secure proxy…");

      const response = await executionApi.get<SmartWalletResponse>(
        `/resolve-smart-wallet/${address}?chainId=${selectedChain}`
      );

      setWalletInfo(response);
      setStatus(
        response.isDeployed
          ? `✅ Safe deployed at ${truncate(response.address, 10)}`
          : "✅ Safe address resolved (not yet deployed)"
      );
    } catch (error) {
      setStatus(`❌ Failed to resolve wallet: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchUserDetails = async () => {
    if (!isProxyHealthy || !address) return;
    try {
      setIsBusy(true);
      setStatus("Fetching user details via secure proxy…");

      // This endpoint requires JWT authentication
      // In a real implementation, you'd pass the JWT from your auth system
      const response = await executionApi.get<UserDetailsResponse>(`/users/me`);

      setUserDetails(response);
      setStatus("✅ User details loaded (via secure proxy)");
    } catch (error) {
      setStatus(`❌ Failed to load user details: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchTVL = async () => {
    if (!isProxyHealthy) return;
    try {
      setIsBusy(true);
      setStatus("Fetching TVL via secure proxy…");

      // Data API call - goes through proxy/data route
      const response = await dataApi.get<TVLResponse>(`/tvl`);

      setTvlData(response);
      setStatus(
        `✅ TVL loaded: ${formatUsd(response.totalTvl)} (via secure proxy)`
      );
    } catch (error) {
      setStatus(`❌ Failed to load TVL: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchVolume = async () => {
    if (!isProxyHealthy) return;
    try {
      setIsBusy(true);
      setStatus("Fetching volume via secure proxy…");

      const response = await dataApi.get<VolumeResponse>(`/volume`);

      setVolumeData(response);
      setStatus(
        `✅ Volume loaded: ${formatUsd(
          response.volumeInUSD
        )} (via secure proxy)`
      );
    } catch (error) {
      setStatus(`❌ Failed to load volume: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchOnchainEarnings = async () => {
    if (!isProxyHealthy || !walletInfo?.address) {
      setStatus("Resolve Smart Wallet first");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching onchain earnings via secure proxy…");

      const response = await dataApi.get<OnchainEarningsResponse>(
        `/usercheck/onchain-earnings?walletAddress=${walletInfo.address}`
      );

      setOnchainEarnings(response);
      setStatus(
        `✅ Earnings loaded: ${formatUsd(
          response.data.totalEarnings
        )} (via secure proxy)`
      );
    } catch (error) {
      setStatus(`❌ Failed to load earnings: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // =============================================================================
  // Client-Side Wallet Operations
  // =============================================================================

  const executeDeposit = async () => {
    if (
      !address ||
      !walletClient ||
      !publicClient ||
      !depositToken ||
      !depositAmount
    ) {
      setStatus("Missing required fields for deposit");
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Preparing deposit transaction…");

      // Deposit is a client-side operation - tokens are sent from the user's wallet
      // The transaction is signed in the browser and broadcast to the blockchain
      // No API keys are needed for this operation

      // Example: Transfer tokens to smart wallet (simplified)
      // In production, use the SDK's depositFunds method with proper ABI encoding

      setStatus(
        "⚠️ Deposit requires wallet signing (implement with proper token transfer)"
      );
    } catch (error) {
      setStatus(`❌ Deposit failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const clearAllState = () => {
    disconnect();
    setProtocols([]);
    setPositions([]);
    setWalletInfo(null);
    setUserDetails(null);
    setTvlData(null);
    setVolumeData(null);
    setOnchainEarnings(null);
    setStatus("Wallet disconnected");
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="app">
      <header>
        <div>
          <h1>🔐 ZyFAI SDK - Secure Demo</h1>
          <p>
            API keys are stored in Vercel environment variables. All API calls
            go through serverless functions.
          </p>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => open?.()}>
            {isConnected ? "Switch Wallet" : "Connect Wallet"}
          </button>
          {isConnected && (
            <button className="secondary" onClick={clearAllState}>
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* Proxy Health Status */}
      <section
        className="status-bar"
        style={{
          background: isProxyHealthy ? "#1a472a" : "#472a1a",
          borderLeft: `4px solid ${isProxyHealthy ? "#4ade80" : "#f87171"}`,
        }}
      >
        <div>
          <strong>API Proxy:</strong>{" "}
          {isChecking
            ? "Checking…"
            : isProxyHealthy
            ? "✅ Connected"
            : "❌ Not Available"}
          {proxyHealth && (
            <span style={{ marginLeft: "1rem", opacity: 0.8 }}>
              Execution API: {proxyHealth.executionApiConfigured ? "✅" : "❌"}{" "}
              | Data API: {proxyHealth.dataApiConfigured ? "✅" : "❌"}
            </span>
          )}
        </div>
        <div>
          <strong>Wallet:</strong>{" "}
          {address
            ? `${address.slice(0, 6)}…${address.slice(-4)}`
            : "Not connected"}
        </div>
      </section>

      <section className="status-bar">
        <div>
          <strong>Status:</strong> {status}
        </div>
      </section>

      {/* Security Notice */}
      <section
        className="panel"
        style={{ background: "#1a2744", borderLeft: "4px solid #60a5fa" }}
      >
        <h2>🛡️ Security Architecture</h2>
        <p>
          This demo demonstrates the <strong>recommended secure pattern</strong>{" "}
          for B2B integrations:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
          <li>
            ✅ API keys are stored in Vercel environment variables (never in
            browser)
          </li>
          <li>✅ All API calls go through serverless functions (/api/*)</li>
          <li>
            ✅ Serverless functions add the <code>x-api-key</code> header
          </li>
          <li>✅ Frontend uses same-origin requests - no keys visible</li>
        </ul>
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#0f172a",
            borderRadius: "4px",
          }}
        >
          <code style={{ fontSize: "0.85rem" }}>
            Frontend → /api/* (Serverless Function adds key) → ZyFAI APIs
          </code>
        </div>
      </section>

      {/* Chain Selection & Basic Actions */}
      <section className="controls">
        <label>
          Target Chain
          <select
            value={selectedChain}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (isSupportedChain(next)) setSelectedChain(next);
            }}
          >
            {CHAIN_OPTIONS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.label}
              </option>
            ))}
          </select>
        </label>
        <div className="control-buttons">
          <button onClick={fetchProtocols} disabled={isBusy || !isProxyHealthy}>
            Fetch Protocols
          </button>
          <button
            onClick={fetchPositions}
            disabled={isBusy || !isProxyHealthy || !address}
          >
            Fetch Positions
          </button>
        </div>
      </section>

      {/* Protocols */}
      <section className="panel">
        <h2>Protocols (via Secure Proxy)</h2>
        {protocols.length === 0 ? (
          <p className="empty">No protocol data loaded yet.</p>
        ) : (
          <div className="list">
            {protocols.slice(0, 5).map((protocol) => (
              <article key={protocol.id}>
                <header>
                  <div>
                    <strong>{protocol.name}</strong>
                    <span> | {protocol.type}</span>
                  </div>
                  <small>
                    Chains: {protocol.chains.map(formatChainName).join(", ")}
                  </small>
                </header>
                <p>{protocol.description ?? "No description"}</p>
              </article>
            ))}
            {protocols.length > 5 && (
              <p className="empty">
                ...and {protocols.length - 5} more protocols
              </p>
            )}
          </div>
        )}
      </section>

      {/* Smart Wallet */}
      <section className="panel">
        <h2>Smart Wallet</h2>
        <div className="control-buttons">
          <button
            onClick={resolveSmartWallet}
            disabled={isBusy || !isProxyHealthy || !address}
          >
            Resolve Smart Wallet
          </button>
        </div>
        {walletInfo && (
          <div className="detail-grid">
            <div className="detail-row">
              <span>Safe Address</span>
              <code>{walletInfo.address}</code>
            </div>
            <div className="detail-row">
              <span>Deployed?</span>
              <strong>{walletInfo.isDeployed ? "Yes" : "No"}</strong>
            </div>
          </div>
        )}
      </section>

      {/* Platform Stats */}
      <section className="panel">
        <h2>Platform Stats (via Secure Proxy)</h2>
        <div className="control-buttons">
          <button onClick={fetchTVL} disabled={isBusy || !isProxyHealthy}>
            Get TVL
          </button>
          <button onClick={fetchVolume} disabled={isBusy || !isProxyHealthy}>
            Get Volume
          </button>
        </div>
        <div className="stats-grid">
          {tvlData && (
            <div className="stat-card">
              <span className="stat-label">Total TVL</span>
              <span className="stat-value">{formatUsd(tvlData.totalTvl)}</span>
            </div>
          )}
          {volumeData && (
            <div className="stat-card">
              <span className="stat-label">Total Volume</span>
              <span className="stat-value">
                {formatUsd(volumeData.volumeInUSD)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Earnings */}
      <section className="panel">
        <h2>Onchain Earnings (via Secure Proxy)</h2>
        <div className="control-buttons">
          <button
            onClick={fetchOnchainEarnings}
            disabled={isBusy || !isProxyHealthy || !walletInfo?.address}
          >
            Get Onchain Earnings
          </button>
        </div>
        {onchainEarnings?.data && (
          <div className="earnings">
            <div>
              <span>Total Earnings</span>
              <strong>{formatUsd(onchainEarnings.data.totalEarnings)}</strong>
            </div>
            <div>
              <span>Current (Active)</span>
              <strong>{formatUsd(onchainEarnings.data.currentEarnings)}</strong>
            </div>
            <div>
              <span>Lifetime (Realized)</span>
              <strong>
                {formatUsd(onchainEarnings.data.lifetimeEarnings)}
              </strong>
            </div>
          </div>
        )}
      </section>

      {/* Deposit */}
      <section className="panel">
        <h2>Deposit Funds (Client-Side Transaction)</h2>
        <p style={{ opacity: 0.8 }}>
          Deposits are wallet transactions - no API key needed. The user signs
          in the browser.
        </p>
        <div className="form-grid">
          <label className="form-field">
            <span>Token Address</span>
            <div className="input-with-presets">
              <input
                type="text"
                placeholder="0x…"
                value={depositToken}
                onChange={(e) => setDepositToken(e.target.value)}
              />
              <div className="preset-buttons">
                {TOKEN_PRESETS[selectedChain]?.map((token) => (
                  <button
                    key={token.address}
                    type="button"
                    className="preset"
                    onClick={() => setDepositToken(token.address)}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
          </label>
          <label className="form-field">
            <span>Amount (in wei)</span>
            <input
              type="text"
              placeholder="e.g. 1000000 for 1 USDC"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </label>
        </div>
        <div className="control-buttons" style={{ marginTop: "1rem" }}>
          <button
            onClick={executeDeposit}
            disabled={isBusy || !address || !depositToken || !depositAmount}
          >
            Execute Deposit
          </button>
        </div>
      </section>

      {/* Implementation Notes */}
      <section className="panel" style={{ background: "#1f2937" }}>
        <h2>📖 Implementation Guide for B2B Clients</h2>
        <div style={{ lineHeight: 1.6 }}>
          <h3 style={{ marginTop: "1rem" }}>
            1. Environment Variables (Vercel)
          </h3>
          <pre
            style={{
              background: "#111827",
              padding: "1rem",
              borderRadius: "4px",
              overflow: "auto",
            }}
          >
            {`# Set in Vercel Dashboard (or .env for local dev)
ZYFAI_API_KEY=zyfai_your_execution_key
ZYFAI_DATA_API_KEY=zyfai_your_data_key`}
          </pre>

          <h3 style={{ marginTop: "1rem" }}>2. Frontend Setup</h3>
          <pre
            style={{
              background: "#111827",
              padding: "1rem",
              borderRadius: "4px",
              overflow: "auto",
            }}
          >
            {`# .env (FRONTEND - only public vars!)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id`}
          </pre>

          <h3 style={{ marginTop: "1rem" }}>3. API Call Pattern</h3>
          <pre
            style={{
              background: "#111827",
              padding: "1rem",
              borderRadius: "4px",
              overflow: "auto",
            }}
          >
            {`// Frontend code - NO API KEYS!
const { dataApi } = useSecureApi();

// This call goes to YOUR backend
// YOUR backend adds the API key
// YOUR backend forwards to ZyFAI
const earnings = await dataApi.get(
  \`/usercheck/onchain-earnings?walletAddress=\${address}\`
);`}
          </pre>
        </div>
      </section>
    </div>
  );
}

export default AppSecure;
