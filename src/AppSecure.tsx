/**
 * ZyFAI SDK Demo - Secure Implementation
 *
 * SDK is initialized server-side with all API keys stored in environment variables.
 * The frontend calls serverless functions that use the server-side SDK.
 */

import { useAppKit } from "@reown/appkit/react";
import type { Protocol, Position, SupportedChainId } from "@zyfai/sdk";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useSecureSdk } from "./hooks/useSecureSdk";
import "./App.css";

// =============================================================================
// Constants
// =============================================================================

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

const CHAIN_OPTIONS: { id: SupportedChainId; label: string }[] = [
  { id: 8453, label: "Base (8453)" },
  { id: 42161, label: "Arbitrum (42161)" },
  { id: 9745, label: "Plasma (9745)" },
];

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

const getExplorerUrl = (chainId: string | number, txHash: string) => {
  const id = String(chainId);
  switch (id) {
    case "8453":
      return `https://basescan.org/tx/${txHash}`;
    case "42161":
      return `https://arbiscan.io/tx/${txHash}`;
    case "9745":
      return `https://explorer.plasma.io/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
};

// =============================================================================
// Types
// =============================================================================

interface SmartWalletResponse {
  address: string;
  isDeployed: boolean;
}

interface DeploySafeResponse {
  success: boolean;
  safeAddress: string;
  txHash: string;
  status: string;
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
    unrealizedEarnings?: number;
    currentEarningsByChain?: Record<string, number>;
    lastCheckTimestamp?: string;
  };
}

interface OpportunitiesResponse {
  data: Array<{
    id: string;
    protocolName?: string;
    protocol_name?: string;
    poolName?: string;
    pool_name?: string;
    apy?: number;
    pool_apy?: number;
    combined_apy?: number;
    chainId?: number;
    chain_id?: number;
    strategy_type?: string;
    strategyType?: string;
  }>;
}

type PositionBundle = Position & { positions?: Position["positions"] };

// =============================================================================
// Main App Component
// =============================================================================

function AppSecure() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  // Secure SDK hook - SDK is initialized server-side with all API keys
  const { sdk, health, isReady, isChecking } = useSecureSdk();

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
  const [deployResult, setDeployResult] = useState<DeploySafeResponse | null>(
    null
  );
  const [tvlData, setTvlData] = useState<TVLResponse | null>(null);
  const [volumeData, setVolumeData] = useState<VolumeResponse | null>(null);
  const [onchainEarnings, setOnchainEarnings] =
    useState<OnchainEarningsResponse | null>(null);
  const [safeOpportunities, setSafeOpportunities] =
    useState<OpportunitiesResponse | null>(null);
  const [degenStrategies, setDegenStrategies] =
    useState<OpportunitiesResponse | null>(null);

  // Deposit state
  const [depositToken, setDepositToken] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReceiver, setWithdrawReceiver] = useState("");

  // Check SDK health on mount
  useEffect(() => {
    if (!isChecking && !isReady) {
      setStatus("SDK not configured. Check environment variables.");
    }
  }, [isChecking, isReady]);

  // =============================================================================
  // SDK Operations
  // =============================================================================

  const fetchProtocols = async () => {
    if (!isReady) {
      setStatus("SDK not ready");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching available protocols…");
      const response = await sdk.getProtocols(selectedChain);
      setProtocols(response.protocols);
      setStatus(`Loaded ${response.protocols.length} protocols.`);
    } catch (error) {
      setStatus(`Failed to load protocols: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchPositions = async () => {
    if (!isReady || !address) return;
    try {
      setIsBusy(true);
      setStatus("Fetching ZyFAI positions…");
      const response = await sdk.getPositions(address, selectedChain);
      setPositions((response.positions as PositionBundle[]) ?? []);
      const hasPositions = response.positions && response.positions.length > 0;
      setStatus(
        hasPositions
          ? `Loaded ${response.positions.length} position bundles.`
          : "No positions found."
      );
    } catch (error) {
      setStatus(`Failed to load positions: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const resolveSmartWallet = async () => {
    if (!isReady || !address) return;
    try {
      setIsBusy(true);
      setStatus("Resolving deterministic Safe address…");
      const response = await sdk.getSmartWallet(address, selectedChain);
      setWalletInfo(response);
      setStatus(
        response.isDeployed
          ? `Safe already deployed at ${response.address}`
          : "Safe not deployed yet. Deterministic address ready."
      );
    } catch (error) {
      setStatus(`Failed to resolve Safe: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const deploySafe = async () => {
    if (!isReady || !address) return;
    try {
      setIsBusy(true);
      setStatus("Deploying Safe smart wallet…");
      const response = await sdk.deploySafe(address, selectedChain);
      setDeployResult(response);
      setStatus(
        response.success
          ? `Safe deployed at ${response.safeAddress}`
          : "Safe deployment reported a failure."
      );
      const refreshedWallet = await sdk.getSmartWallet(address, selectedChain);
      setWalletInfo(refreshedWallet);
    } catch (error) {
      setStatus(`Failed to deploy Safe: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchTVL = async () => {
    if (!isReady) return;
    try {
      setIsBusy(true);
      setStatus("Fetching TVL data…");
      const response = await sdk.getTVL();
      setTvlData(response);
      setStatus(`TVL loaded: ${formatUsd(response.totalTvl)}`);
    } catch (error) {
      setStatus(`Failed to get TVL: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchVolume = async () => {
    if (!isReady) return;
    try {
      setIsBusy(true);
      setStatus("Fetching volume data…");
      const response = await sdk.getVolume();
      setVolumeData(response);
      setStatus(`Volume loaded: ${formatUsd(response.volumeInUSD)}`);
    } catch (error) {
      setStatus(`Failed to get volume: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchOnchainEarnings = async () => {
    if (!isReady || !walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching onchain earnings…");
      const response = await sdk.getEarnings(walletInfo.address);
      setOnchainEarnings(response);
      setStatus(
        `Onchain earnings loaded: ${formatUsd(response.data.totalEarnings)}`
      );
    } catch (error) {
      setStatus(`Failed to get onchain earnings: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const calculateEarnings = async () => {
    if (!isReady || !walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Calculating onchain earnings (this may take a moment)…");
      const response = await sdk.calculateEarnings(walletInfo.address);
      setOnchainEarnings(response);
      setStatus(
        `Earnings recalculated: ${formatUsd(response.data.totalEarnings)}`
      );
    } catch (error) {
      setStatus(`Failed to calculate earnings: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchSafeOpportunities = async () => {
    if (!isReady) return;
    try {
      setIsBusy(true);
      setStatus("Fetching safe opportunities…");
      const response = await sdk.getSafeOpportunities(selectedChain);
      setSafeOpportunities(response);
      setStatus(`Loaded ${response.data.length} safe opportunities.`);
    } catch (error) {
      setStatus(
        `Failed to get safe opportunities: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const fetchDegenStrategies = async () => {
    if (!isReady) return;
    try {
      setIsBusy(true);
      setStatus("Fetching degen strategies…");
      const response = await sdk.getDegenStrategies(selectedChain);
      setDegenStrategies(response);
      setStatus(`Loaded ${response.data.length} degen strategies.`);
    } catch (error) {
      setStatus(`Failed to get degen strategies: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const executeDeposit = async () => {
    if (!address || !depositToken || !depositAmount) {
      setStatus("Please enter token address and amount.");
      return;
    }
    // Note: Deposit requires wallet signing - would need additional implementation
    setStatus(
      "Deposit functionality requires wallet signing integration (not yet implemented in secure demo)."
    );
  };

  const executeWithdraw = async () => {
    if (!address) {
      setStatus("Please connect a wallet first.");
      return;
    }
    // Note: Withdraw requires wallet signing - would need additional implementation
    setStatus(
      "Withdraw functionality requires wallet signing integration (not yet implemented in secure demo)."
    );
  };

  const clearAllState = () => {
    disconnect();
    setProtocols([]);
    setPositions([]);
    setWalletInfo(null);
    setDeployResult(null);
    setTvlData(null);
    setVolumeData(null);
    setOnchainEarnings(null);
    setSafeOpportunities(null);
    setDegenStrategies(null);
    setDepositToken("");
    setDepositAmount("");
    setWithdrawAmount("");
    setWithdrawReceiver("");
    setStatus("Wallet disconnected.");
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="app">
      <header>
        <div>
          <h1>ZyFAI SDK + Reown AppKit</h1>
          <p>
            Connect an EOA via Reown, then query protocols, positions, earnings,
            and more using the SDK.
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

      <section className="status-bar">
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>Connected:</strong>{" "}
          {address
            ? `${address.slice(0, 6)}…${address.slice(-4)}`
            : "No wallet"}
        </div>
      </section>

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
          <button onClick={fetchProtocols} disabled={isBusy || !isReady}>
            Fetch Protocols
          </button>
          <button
            onClick={fetchPositions}
            disabled={isBusy || !isReady || !address}
          >
            Fetch Positions
          </button>
        </div>
      </section>

      {/* =============================== PROTOCOLS =============================== */}
      <section className="panel">
        <h2>Protocols</h2>
        {protocols.length === 0 ? (
          <p className="empty">No protocol data loaded yet.</p>
        ) : (
          <div className="list">
            {protocols.map((protocol) => {
              const poolCount = protocol.pools?.length ?? 0;
              return (
                <article key={protocol.id}>
                  <header>
                    <div>
                      <strong>{protocol.name}</strong>
                      <span> | {protocol.type}</span>
                    </div>
                    <small>
                      Chains: {protocol.chains.map(formatChainName).join(", ")}
                      {poolCount > 0 && <span> | Pools: {poolCount}</span>}
                    </small>
                  </header>
                  <p>{protocol.description ?? "No description provided."}</p>
                  {protocol.website && (
                    <a href={protocol.website} target="_blank" rel="noreferrer">
                      {protocol.website}
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* =============================== POSITIONS =============================== */}
      <section className="panel">
        <h2>Positions</h2>
        {positions.length === 0 ? (
          <p className="empty">No active ZyFAI positions detected.</p>
        ) : (
          <div className="list">
            {positions.map((bundle, index) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = bundle as any;
              const chainName =
                data.chain ||
                data.positions?.[0]?.chain ||
                (data.chainId ? formatChainName(data.chainId) : null) ||
                (data.positions?.[0]?.chain_id
                  ? formatChainName(data.positions[0].chain_id)
                  : "Multi-chain");

              return (
                <article key={`${bundle.strategy}-${index}`}>
                  <header>
                    <div>
                      <strong>{bundle.strategy ?? "Unknown strategy"}</strong>
                      <span> | {chainName}</span>
                    </div>
                    <small>{bundle.smartWallet}</small>
                  </header>
                  {(bundle.positions ?? []).map((slot, slotIndex) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pos = slot as any;
                    const apy = pos.pool_apy ?? pos.apy;
                    const tvl = pos.pool_tvl ?? pos.tvl;
                    const underlying =
                      pos.underlyingAmount ??
                      pos.underlying_amount ??
                      pos.amount ??
                      "0";

                    return (
                      <div
                        key={`${slot.protocol_id}-${slotIndex}`}
                        className="slot"
                      >
                        <div>
                          <strong>
                            {slot.protocol_name ??
                              slot.protocol_id ??
                              "Protocol"}
                          </strong>
                          <span> | {slot.pool ?? "Pool n/a"}</span>
                        </div>
                        <ul>
                          <li>Token: {slot.token_symbol ?? "Unknown"}</li>
                          <li>Underlying: {underlying}</li>
                          <li>
                            APY:{" "}
                            {apy != null ? `${Number(apy).toFixed(2)}%` : "n/a"}
                          </li>
                          <li>
                            Pool TVL: {tvl != null ? formatUsd(tvl) : "n/a"}
                          </li>
                        </ul>
                      </div>
                    );
                  })}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* =============================== SMART WALLET =============================== */}
      <section className="panel">
        <h2>Smart Wallet</h2>
        <p>
          Resolve the deterministic Safe address for this user and deploy it if
          necessary.
        </p>
        <div className="control-buttons">
          <button
            onClick={resolveSmartWallet}
            disabled={isBusy || !isReady || !address}
          >
            Resolve Smart Wallet
          </button>
          <button
            onClick={deploySafe}
            disabled={isBusy || !isReady || !address}
          >
            Deploy Safe Smart Wallet
          </button>
        </div>

        {walletInfo ? (
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
        ) : (
          <p className="empty">
            Resolve to view the deterministic Safe address.
          </p>
        )}

        {deployResult && (
          <div className="callout">
            <div>
              <strong>Last Deployment</strong>
            </div>
            <p>
              Status: {deployResult.status} · Tx:{" "}
              <a
                href={getExplorerUrl(selectedChain, deployResult.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {truncate(deployResult.txHash, 10)}
              </a>
            </p>
          </div>
        )}
      </section>

      {/* =============================== TVL & VOLUME =============================== */}
      <section className="panel">
        <h2>Platform Stats (TVL & Volume)</h2>
        <p>
          Get total value locked and transaction volume across all ZyFAI
          accounts.
        </p>
        <div className="control-buttons">
          <button onClick={fetchTVL} disabled={isBusy || !isReady}>
            Get TVL
          </button>
          <button onClick={fetchVolume} disabled={isBusy || !isReady}>
            Get Volume
          </button>
        </div>

        <div className="stats-grid">
          {tvlData && (
            <div className="stat-card">
              <span className="stat-label">Total TVL</span>
              <span className="stat-value">{formatUsd(tvlData.totalTvl)}</span>
              {tvlData.byChain && Object.keys(tvlData.byChain).length > 0 && (
                <div className="stat-breakdown">
                  {Object.entries(tvlData.byChain).map(([chain, value]) => (
                    <div key={chain}>
                      {formatChainName(chain)}: {formatUsd(value)}
                    </div>
                  ))}
                </div>
              )}
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

      {/* =============================== DEPOSIT =============================== */}
      <section className="panel">
        <h2>Deposit Funds</h2>
        <p>
          Transfer tokens into your ZyFAI smart wallet for yield optimization.
          Amounts are in least decimal units (e.g., 1 USDC = 1000000).
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
            <span>Amount (least decimals)</span>
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

      {/* =============================== WITHDRAW =============================== */}
      <section className="panel">
        <h2>Withdraw Funds</h2>
        <p>
          Withdraw funds from your ZyFAI smart wallet. Leave amount empty for a
          full withdrawal. Leave receiver empty to send to your EOA.
        </p>

        <div className="form-grid">
          <label className="form-field">
            <span>Amount (optional, least decimals)</span>
            <input
              type="text"
              placeholder="Empty = full withdrawal"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Receiver (optional)</span>
            <input
              type="text"
              placeholder="0x… (defaults to your EOA)"
              value={withdrawReceiver}
              onChange={(e) => setWithdrawReceiver(e.target.value)}
            />
          </label>
        </div>

        <div className="control-buttons" style={{ marginTop: "1rem" }}>
          <button onClick={executeWithdraw} disabled={isBusy || !address}>
            Execute Withdraw
          </button>
        </div>
      </section>

      {/* =============================== ONCHAIN EARNINGS =============================== */}
      <section className="panel">
        <h2>Onchain Earnings</h2>
        <p>Get and calculate earnings for your smart wallet.</p>
        <div className="control-buttons">
          <button
            onClick={fetchOnchainEarnings}
            disabled={isBusy || !isReady || !walletInfo?.address}
          >
            Get Onchain Earnings
          </button>
          <button
            onClick={calculateEarnings}
            disabled={isBusy || !isReady || !walletInfo?.address}
          >
            Calculate/Refresh Earnings
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
            {onchainEarnings.data.unrealizedEarnings !== undefined && (
              <div>
                <span>Unrealized</span>
                <strong>
                  {formatUsd(onchainEarnings.data.unrealizedEarnings)}
                </strong>
              </div>
            )}
          </div>
        )}

        {onchainEarnings?.data?.currentEarningsByChain && (
          <div className="detail-grid" style={{ marginTop: "1rem" }}>
            <div className="detail-row">
              <span>
                <strong>Earnings by Chain</strong>
              </span>
            </div>
            {Object.entries(onchainEarnings.data.currentEarningsByChain).map(
              ([chain, amount]) => (
                <div key={chain} className="detail-row">
                  <span>{formatChainName(chain)}</span>
                  <strong>{formatUsd(amount)}</strong>
                </div>
              )
            )}
          </div>
        )}

        {onchainEarnings?.data?.lastCheckTimestamp && (
          <p className="empty" style={{ marginTop: "1rem" }}>
            Last updated:{" "}
            {new Date(onchainEarnings.data.lastCheckTimestamp).toLocaleString()}
          </p>
        )}
      </section>

      {/* =============================== OPPORTUNITIES =============================== */}
      <section className="panel">
        <h2>Yield Opportunities</h2>
        <p>Explore safe and degen yield strategies on the selected chain.</p>
        <div className="control-buttons">
          <button
            onClick={fetchSafeOpportunities}
            disabled={isBusy || !isReady}
          >
            Get Safe Opportunities
          </button>
          <button onClick={fetchDegenStrategies} disabled={isBusy || !isReady}>
            Get Degen Strategies
          </button>
        </div>

        {safeOpportunities && safeOpportunities.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>
              Safe Opportunities ({safeOpportunities.data.length})
            </strong>
            {safeOpportunities.data.slice(0, 5).map((opp) => {
              const protocolName =
                opp.protocolName || opp.protocol_name || "Protocol";
              const poolName = opp.poolName || opp.pool_name || "Pool";
              const apy = opp.apy || opp.pool_apy || opp.combined_apy || 0;
              const chainId = opp.chainId || opp.chain_id;

              return (
                <article key={opp.id}>
                  <header>
                    <div>
                      <strong>{protocolName}</strong>
                      <span> | {poolName}</span>
                    </div>
                    <small>APY: {Number(apy).toFixed(2)}%</small>
                  </header>
                  <div>Chain: {formatChainName(chainId)}</div>
                </article>
              );
            })}
          </div>
        )}

        {degenStrategies && degenStrategies.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>Degen Strategies ({degenStrategies.data.length})</strong>
            {degenStrategies.data.slice(0, 5).map((strat) => {
              const protocolName =
                strat.protocolName || strat.protocol_name || "Protocol";
              const poolName = strat.poolName || strat.pool_name || "Pool";
              const apy =
                strat.apy || strat.pool_apy || strat.combined_apy || 0;
              const chainId = strat.chainId || strat.chain_id;
              const strategyType = strat.strategy_type || strat.strategyType;

              return (
                <article key={strat.id}>
                  <header>
                    <div>
                      <strong>{protocolName}</strong>
                      <span> | {poolName}</span>
                    </div>
                    <small>APY: {Number(apy).toFixed(2)}%</small>
                  </header>
                  <div>
                    Chain: {formatChainName(chainId)}
                    {strategyType && <span> · Strategy: {strategyType}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default AppSecure;
