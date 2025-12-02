import { useAppKit } from "@reown/appkit/react";
import type {
  DeploySafeResponse,
  DepositResponse,
  EarningsResponse,
  Position,
  Protocol,
  SessionKeyResponse,
  SmartWalletResponse,
  SupportedChainId,
  WithdrawResponse,
} from "@zyfai/sdk";
import { ZyfaiSDK } from "@zyfai/sdk";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import "./App.css";

// Common token addresses per chain for convenience
const TOKEN_PRESETS: Record<SupportedChainId, { symbol: string; address: string }[]> = {
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

const defaultChainEnv = Number(import.meta.env.VITE_DEFAULT_CHAIN_ID ?? 8453);
const DEFAULT_CHAIN = isSupportedChain(defaultChainEnv)
  ? (defaultChainEnv as SupportedChainId)
  : (8453 as SupportedChainId);

type PositionBundle = Position & { positions?: Position["positions"] };
const truncate = (value?: string, visible = 8) => {
  if (!value) {
    return "";
  }
  if (value.length <= visible * 2) {
    return value;
  }
  return `${value.slice(0, visible)}…${value.slice(-4)}`;
};

function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  const [status, setStatus] = useState("Connect a wallet to begin");
  const [selectedChain, setSelectedChain] =
    useState<SupportedChainId>(DEFAULT_CHAIN);
  const [isBusy, setIsBusy] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [positions, setPositions] = useState<PositionBundle[]>([]);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [walletInfo, setWalletInfo] = useState<SmartWalletResponse | null>(null);
  const [deploymentResult, setDeploymentResult] =
    useState<DeploySafeResponse | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionKeyResponse | null>(
    null
  );

  // Deposit state
  const [depositToken, setDepositToken] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositResult, setDepositResult] = useState<DepositResponse | null>(null);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReceiver, setWithdrawReceiver] = useState("");
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(null);

  const sdk = useMemo(() => {
    const apiKey = import.meta.env.VITE_ZYFAI_API_KEY;
    const bundlerApiKey = import.meta.env.VITE_BUNDLER_API_KEY;

    if (!apiKey || !bundlerApiKey) {
      console.warn(
        "Set VITE_ZYFAI_API_KEY and VITE_BUNDLER_API_KEY to use the SDK."
      );
      return null;
    }

    return new ZyfaiSDK({
      apiKey,
      bundlerApiKey,
      environment: "staging",
    });
  }, []);

  useEffect(() => {
    if (!sdk || !walletClient || !address) {
      return;
    }

    let active = true;

    setStatus("Linking Reown wallet to ZyFAI SDK…");
    sdk
      .connectAccount(
        walletClient,
        walletClient.chain?.id as SupportedChainId | undefined
      )
      .then(() => {
        if (active) {
          setStatus("Wallet ready. You can now fetch ZyFAI data.");
        }
      })
      .catch((error) => {
        if (active) {
          setStatus(`Failed to connect wallet: ${(error as Error).message}`);
        }
      });

    return () => {
      active = false;
    };
  }, [sdk, walletClient, address]);

  const ensureSdk = () => {
    if (!sdk) {
      setStatus("Missing env vars. Update VITE_ZYFAI_API_KEY/BUNDLER_API_KEY.");
      return false;
    }
    return true;
  };

  const ensureWallet = () => {
    if (!ensureSdk()) {
      return false;
    }

    if (!address) {
      setStatus("Please connect a wallet via the Reown modal first.");
      return false;
    }

    return true;
  };

  const fetchProtocols = async () => {
    if (!ensureSdk()) {
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Fetching available protocols…");
      const response = await sdk!.getAvailableProtocols(selectedChain);
      setProtocols(response.protocols);
      setStatus(`Loaded ${response.protocols.length} protocols.`);
    } catch (error) {
      setStatus(`Failed to load protocols: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchPositions = async () => {
    if (!ensureWallet()) {
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Fetching ZyFAI positions…");
      const response = await sdk!.getPositions(address!, selectedChain);
      setPositions(response.positions ?? []);
      setStatus(`Loaded ${response.positions.length} position bundles.`);
    } catch (error) {
      setStatus(`Failed to load positions: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchEarnings = async () => {
    if (!ensureWallet()) {
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Fetching ZyFAI earnings…");
      const response = await sdk!.getEarnings(address!, selectedChain);
      setEarnings(response);
      setStatus("Earnings summary refreshed.");
    } catch (error) {
      setStatus(`Failed to load earnings: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const resolveSmartWallet = async () => {
    if (!ensureWallet()) {
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Resolving deterministic Safe address…");
      const response = await sdk!.getSmartWalletAddress(
        address!,
        selectedChain
      );
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
    if (!ensureWallet()) {
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Deploying Safe smart wallet…");
      const response = await sdk!.deploySafe(address!, selectedChain);
      setDeploymentResult(response);
      setStatus(
        response.success
          ? `Safe deployed at ${response.safeAddress}`
          : "Safe deployment reported a failure."
      );
      const refreshedWallet = await sdk!.getSmartWalletAddress(
        address!,
        selectedChain
      );
      setWalletInfo(refreshedWallet);
    } catch (error) {
      setStatus(`Failed to deploy Safe: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const createSessionKey = async () => {
    if (!ensureWallet()) {
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Creating + activating session key…");
      const response = await sdk!.createSessionKey(address!, selectedChain);
      setSessionInfo(response);
      setStatus("Session key registered with ZyFAI API.");
    } catch (error) {
      setStatus(`Failed to create session key: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const executeDeposit = async () => {
    if (!ensureWallet()) {
      return;
    }

    if (!depositToken) {
      setStatus("Please enter a token address for deposit.");
      return;
    }

    if (!depositAmount || depositAmount === "0") {
      setStatus("Please enter a valid deposit amount (in least decimal units).");
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Depositing funds to ZyFAI…");
      const response = await sdk!.depositFunds(
        address!,
        selectedChain,
        depositToken,
        depositAmount
      );
      setDepositResult(response);
      setStatus(
        response.success
          ? `Deposit submitted. Tx: ${truncate(response.txHash, 10)}`
          : "Deposit reported a failure."
      );
    } catch (error) {
      setStatus(`Failed to deposit: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const executeWithdraw = async () => {
    if (!ensureWallet()) {
      return;
    }

    try {
      setIsBusy(true);
      const isFullWithdraw = !withdrawAmount || withdrawAmount === "0";
      setStatus(
        isFullWithdraw
          ? "Withdrawing all funds from ZyFAI…"
          : `Withdrawing ${withdrawAmount} from ZyFAI…`
      );
      const response = await sdk!.withdrawFunds(
        address!,
        selectedChain,
        withdrawAmount || undefined,
        withdrawReceiver || undefined
      );
      setWithdrawResult(response);
      setStatus(
        response.success
          ? `Withdraw submitted. Tx: ${truncate(response.txHash, 10)}`
          : "Withdraw reported a failure."
      );
    } catch (error) {
      setStatus(`Failed to withdraw: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1>ZyFAI SDK + Reown AppKit</h1>
          <p>
            Connect an EOA via Reown, then query protocols, positions, and
            earnings using the local SDK build.
          </p>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => open?.()}>
            {isConnected ? "Switch Wallet" : "Connect Wallet"}
          </button>
          {isConnected ? (
            <button
              className="secondary"
              onClick={() => {
                disconnect();
                setProtocols([]);
                setPositions([]);
                setEarnings(null);
                setWalletInfo(null);
                setDeploymentResult(null);
                setSessionInfo(null);
                setDepositToken("");
                setDepositAmount("");
                setDepositResult(null);
                setWithdrawAmount("");
                setWithdrawReceiver("");
                setWithdrawResult(null);
                setStatus("Wallet disconnected.");
              }}
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </header>

      <section className="status-bar">
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>Connected:</strong>{" "}
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "No wallet"}
        </div>
      </section>

      <section className="controls">
        <label>
          Target Chain
          <select
            value={selectedChain}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (isSupportedChain(next)) {
                setSelectedChain(next);
              }
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
          <button onClick={fetchProtocols} disabled={isBusy}>
            Fetch Protocols
          </button>
          <button onClick={fetchPositions} disabled={isBusy || !address}>
            Fetch Positions
          </button>
          <button onClick={fetchEarnings} disabled={isBusy || !address}>
            Fetch Earnings
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Smart Wallet</h2>
        <p>
          Resolve the deterministic Safe address for this user and deploy it if
          necessary.
        </p>
        <div className="control-buttons">
          <button onClick={resolveSmartWallet} disabled={isBusy || !address}>
            Resolve Smart Wallet
          </button>
          <button onClick={deploySafe} disabled={isBusy || !address}>
            Deploy Safe
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
          <p className="empty">Resolve to view the deterministic Safe address.</p>
        )}

        {deploymentResult ? (
          <div className="callout">
            <div>
              <strong>Last Deployment</strong>
            </div>
            <p>
              Status: {deploymentResult.status} · Tx:{" "}
              <a
                href={`https://arbiscan.io/tx/${deploymentResult.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {truncate(deploymentResult.txHash, 10)}
              </a>
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Session Key</h2>
        <p>
          The demo uses the SDK&apos;s `createSessionKey` helper to fetch config,
          sign, and register a session in one click.
        </p>
        <div className="control-buttons">
          <button onClick={createSessionKey} disabled={isBusy || !address}>
            Create Session Key
          </button>
        </div>

        {sessionInfo ? (
          <div className="detail-grid">
            <div className="detail-row">
              <span>Signer</span>
              <code>{sessionInfo.sessionKeyAddress}</code>
            </div>
            <div className="detail-row">
              <span>User ID</span>
              <strong>{sessionInfo.userId ?? "n/a"}</strong>
            </div>
            <div className="detail-row">
              <span>Signature</span>
              <code>{truncate(sessionInfo.signature, 14)}</code>
            </div>
            <div className="detail-row">
              <span>Activation</span>
              <strong>
                {sessionInfo.sessionActivation?.isActive
                  ? "Active"
                  : "Pending"}
              </strong>
            </div>
          </div>
        ) : (
          <p className="empty">Generate a session to view its metadata.</p>
        )}
      </section>

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

        {depositResult ? (
          <div className="callout">
            <div>
              <strong>Last Deposit</strong>
            </div>
            <p>
              Status: {depositResult.status} · Amount: {depositResult.amount} ·
              Tx:{" "}
              <a
                href={`https://basescan.org/tx/${depositResult.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {truncate(depositResult.txHash, 10)}
              </a>
            </p>
          </div>
        ) : null}
      </section>

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

        {withdrawResult ? (
          <div className="callout">
            <div>
              <strong>Last Withdraw</strong>
            </div>
            <p>
              Type: {withdrawResult.type} · Amount: {withdrawResult.amount} ·
              Receiver: {truncate(withdrawResult.receiver, 8)} · Tx:{" "}
              <a
                href={`https://basescan.org/tx/${withdrawResult.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {truncate(withdrawResult.txHash, 10)}
              </a>
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Protocols</h2>
        {protocols.length === 0 ? (
          <p className="empty">No protocol data loaded yet.</p>
        ) : (
          <div className="list">
            {protocols.map((protocol) => (
              <article key={protocol.id}>
                <header>
                  <div>
                    <strong>{protocol.name}</strong>
                    <span>{protocol.type}</span>
                  </div>
                  <small>
                    Chains: {protocol.chains.join(", ")} | Pools:{" "}
                    {protocol.pools?.length ?? 0}
                  </small>
                </header>
                <p>{protocol.description ?? "No description provided."}</p>
                {protocol.website ? (
                  <a href={protocol.website} target="_blank" rel="noreferrer">
                    {protocol.website}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Positions</h2>
        {positions.length === 0 ? (
          <p className="empty">No active ZyFAI positions detected.</p>
        ) : (
          <div className="list">
            {positions.map((bundle, index) => (
              <article key={`${bundle.strategy}-${index}`}>
                <header>
                  <div>
                    <strong>{bundle.strategy ?? "Unknown strategy"}</strong>
                    <span>{bundle.chain ?? "Unknown chain"}</span>
                  </div>
                  <small>{bundle.smartWallet}</small>
                </header>
                {(bundle.positions ?? []).map((slot, slotIndex) => (
                  <div key={`${slot.protocol_id}-${slotIndex}`} className="slot">
                    <div>
                      <strong>
                        {slot.protocol_name ?? slot.protocol_id ?? "Protocol"}
                      </strong>
                      <span>{slot.pool ?? "Pool n/a"}</span>
                    </div>
                    <ul>
                      <li>Token: {slot.token_symbol ?? "Unknown"}</li>
                      <li>Underlying: {slot.underlyingAmount ?? slot.amount ?? "0"}</li>
                      <li>APY: {slot.pool_apy ?? "n/a"}</li>
                      <li>Pool TVL: {slot.pool_tvl ?? "n/a"}</li>
                    </ul>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Earnings</h2>
        {earnings ? (
          <div className="earnings">
            <div>
              <span>Total</span>
              <strong>${earnings.totalEarningsUsd.toFixed(2)}</strong>
            </div>
            <div>
              <span>Unrealized</span>
              <strong>${earnings.unrealizedEarningsUsd.toFixed(2)}</strong>
            </div>
            <div>
              <span>Realized</span>
              <strong>${earnings.realizedEarningsUsd.toFixed(2)}</strong>
            </div>
          </div>
        ) : (
          <p className="empty">Run the earnings query to populate data.</p>
        )}
      </section>
    </div>
  );
}

export default App;
