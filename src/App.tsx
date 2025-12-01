import { useAppKit } from "@reown/appkit/react";
import type {
  DeploySafeResponse,
  EarningsResponse,
  Position,
  Protocol,
  SessionKeyResponse,
  SmartWalletResponse,
  SupportedChainId,
} from "@zyfai/sdk";
import { ZyfaiSDK } from "@zyfai/sdk";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import "./App.css";

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
