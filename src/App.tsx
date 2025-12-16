import { useAppKit } from "@reown/appkit/react";
import type {
  DeploySafeResponse,
  DepositResponse,
  Position,
  Protocol,
  SessionKeyResponse,
  SmartWalletResponse,
  SupportedChainId,
  WithdrawResponse,
  UserDetailsResponse,
  TVLResponse,
  VolumeResponse,
  ActiveWalletsResponse,
  SmartWalletByEOAResponse,
  FirstTopupResponse,
  HistoryResponse,
  OnchainEarningsResponse,
  DailyEarningsResponse,
  DebankPortfolioResponse,
  OpportunitiesResponse,
  DailyApyHistoryResponse,
  RebalanceInfoResponse,
  RebalanceFrequencyResponse,
} from "@zyfai/sdk";
import { ZyfaiSDK } from "@zyfai/sdk";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import "./App.css";

// Common token addresses per chain for convenience
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

const defaultChainEnv = Number(8453);
const DEFAULT_CHAIN = isSupportedChain(defaultChainEnv)
  ? (defaultChainEnv as SupportedChainId)
  : (8453 as SupportedChainId);

type PositionBundle = Position & {
  positions?: Position["positions"];
  chain?: string;
};

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

function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  const [status, setStatus] = useState("Connect a wallet to begin");
  const [selectedChain, setSelectedChain] =
    useState<SupportedChainId>(DEFAULT_CHAIN);
  const [isBusy, setIsBusy] = useState(false);

  // Original state
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [positions, setPositions] = useState<PositionBundle[]>([]);
  const [walletInfo, setWalletInfo] = useState<SmartWalletResponse | null>(
    null
  );
  const [deploymentResult, setDeploymentResult] =
    useState<DeploySafeResponse | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionKeyResponse | null>(
    null
  );

  // Deposit state
  const [depositToken, setDepositToken] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositResult, setDepositResult] = useState<DepositResponse | null>(
    null
  );

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReceiver, setWithdrawReceiver] = useState("");
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(
    null
  );

  // New state for additional SDK methods
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(
    null
  );
  const [tvlData, setTvlData] = useState<TVLResponse | null>(null);
  const [volumeData, setVolumeData] = useState<VolumeResponse | null>(null);
  const [activeWallets, setActiveWallets] =
    useState<ActiveWalletsResponse | null>(null);
  const [smartWalletByEoa, setSmartWalletByEoa] =
    useState<SmartWalletByEOAResponse | null>(null);
  const [firstTopup, setFirstTopup] = useState<FirstTopupResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [onchainEarnings, setOnchainEarnings] =
    useState<OnchainEarningsResponse | null>(null);
  const [dailyEarnings, setDailyEarnings] =
    useState<DailyEarningsResponse | null>(null);
  const [debankPortfolio, setDebankPortfolio] =
    useState<DebankPortfolioResponse | null>(null);
  const [safeOpportunities, setSafeOpportunities] =
    useState<OpportunitiesResponse | null>(null);
  const [degenStrategies, setDegenStrategies] =
    useState<OpportunitiesResponse | null>(null);
  const [apyHistory, setApyHistory] = useState<DailyApyHistoryResponse | null>(
    null
  );
  const [rebalanceInfo, setRebalanceInfo] =
    useState<RebalanceInfoResponse | null>(null);
  const [rebalanceFrequency, setRebalanceFrequency] =
    useState<RebalanceFrequencyResponse | null>(null);

  // Additional input states
  const [earningsStartDate, setEarningsStartDate] = useState("");
  const [earningsEndDate, setEarningsEndDate] = useState("");
  const [apyHistoryDays, setApyHistoryDays] = useState<"7D" | "14D" | "30D">(
    "7D"
  );
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

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
    if (!sdk || !walletClient || !address) return;

    let active = true;

    setStatus("Linking Reown wallet to ZyFAI SDK…");
    sdk
      .connectAccount(
        walletClient,
        walletClient.chain?.id as SupportedChainId | undefined
      )
      .then(() => {
        if (active) setStatus("Wallet ready. You can now fetch ZyFAI data.");
      })
      .catch((error) => {
        if (active)
          setStatus(`Failed to connect wallet: ${(error as Error).message}`);
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
    if (!ensureSdk()) return false;
    if (!address) {
      setStatus("Please connect a wallet via the Reown modal first.");
      return false;
    }
    return true;
  };

  // ============================================================================
  // Original SDK Methods
  // ============================================================================

  const fetchProtocols = async () => {
    if (!ensureSdk()) return;
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
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching ZyFAI positions…");
      const response = await sdk!.getPositions(address!, selectedChain);
      console.log("response", response);
      setPositions(response.positions ?? []);
      if (
        response.positions.some(
          (position) =>
            position.positions === null || position.positions?.length === 0
        )
      ) {
        setStatus("No positions found.");
      } else {
        setStatus(`Loaded ${response.positions.length} position bundles.`);
      }
    } catch (error) {
      setStatus(`Failed to load positions: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const resolveSmartWallet = async () => {
    if (!ensureWallet()) return;
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
    if (!ensureWallet()) return;
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
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Creating + activating session key…");
      const response = await sdk!.createSessionKey(address!, selectedChain);
      setSessionInfo(response);
      setStatus("Session key registered with ZyFAI API.");
      // Refresh user details to get updated hasActiveSessionKey status
      try {
        const updatedUser = await sdk!.getUserDetails();
        setUserDetails(updatedUser);
      } catch {
        // Ignore errors - user details refresh is not critical
      }
    } catch (error) {
      setStatus(`Failed to create session key: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const executeDeposit = async () => {
    if (!ensureWallet()) return;
    if (!depositToken) {
      setStatus("Please enter a token address for deposit.");
      return;
    }
    if (!depositAmount || depositAmount === "0") {
      setStatus(
        "Please enter a valid deposit amount (in least decimal units)."
      );
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
    if (!ensureWallet()) return;
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
          ? `Withdraw submitted.`
          : "Withdraw reported a failure."
      );
    } catch (error) {
      setStatus(`Failed to withdraw: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // New SDK Methods
  // ============================================================================

  const fetchUserDetails = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching user details…");
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
      setStatus("User details loaded.");
    } catch (error) {
      setStatus(`Failed to get user details: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const updateUserProfile = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first to get the Safe address.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Updating user profile with smart wallet…");
      await sdk!.updateUserProfile({
        smartWallet: walletInfo.address,
        chains: [selectedChain],
      });
      setStatus(
        `Profile updated with Smart Wallet: ${truncate(walletInfo.address, 10)}`
      );
      // Refresh user details to show updated info
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
    } catch (error) {
      setStatus(`Failed to update profile: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const updateProtocols = async () => {
    if (!ensureWallet()) return;
    if (selectedProtocols.length === 0) {
      setStatus("Please select at least one protocol to update.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Updating user protocols…");
      await sdk!.updateUserProfile({
        protocols: selectedProtocols,
      });
      setStatus(
        `Protocols updated successfully! Selected ${selectedProtocols.length} protocol(s).`
      );
      // Refresh user details to show updated info
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
    } catch (error) {
      setStatus(`Failed to update protocols: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchTVL = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching TVL data…");
      const response = await sdk!.getTVL();
      setTvlData(response);
      setStatus(`TVL loaded: ${formatUsd(response.totalTvl)}`);
    } catch (error) {
      setStatus(`Failed to get TVL: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchVolume = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching volume data…");
      const response = await sdk!.getVolume();
      setVolumeData(response);
      setStatus(`Volume loaded: ${formatUsd(response.volumeInUSD)}`);
    } catch (error) {
      setStatus(`Failed to get volume: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchActiveWallets = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching active wallets…");
      const response = await sdk!.getActiveWallets(selectedChain);
      setActiveWallets(response);
      setStatus(
        `Loaded ${response.count} active wallets on ${formatChainName(
          selectedChain
        )}.`
      );
    } catch (error) {
      setStatus(`Failed to get active wallets: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchFirstTopup = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching first topup…");
      const response = await sdk!.getFirstTopup(
        walletInfo.address,
        selectedChain
      );
      setFirstTopup(response);
      setStatus(
        response.date
          ? `First topup: ${response.date}`
          : "No topup history found."
      );
    } catch (error) {
      setStatus(`Failed to get first topup: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchHistory = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching transaction history…");
      const response = await sdk!.getHistory(
        walletInfo.address,
        selectedChain,
        { limit: 20 }
      );
      setHistory(response);
      setStatus(`Loaded ${response.data.length} history entries.`);
    } catch (error) {
      setStatus(`Failed to get history: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchOnchainEarnings = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching onchain earnings…");
      const response = await sdk!.getOnchainEarnings(walletInfo.address);
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
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Calculating onchain earnings (this may take a moment)…");
      const response = await sdk!.calculateOnchainEarnings(walletInfo.address);
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

  const fetchDailyEarnings = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching daily earnings…");
      const response = await sdk!.getDailyEarnings(
        walletInfo.address,
        earningsStartDate || undefined,
        earningsEndDate || undefined
      );
      setDailyEarnings(response);
      setStatus(`Loaded ${response.count} daily earnings entries.`);
    } catch (error) {
      setStatus(`Failed to get daily earnings: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchDebankPortfolio = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching Debank portfolio…");
      const response = await sdk!.getDebankPortfolio(walletInfo.address);
      setDebankPortfolio(response);
      setStatus(`Portfolio loaded: ${formatUsd(response.totalValueUsd)}`);
    } catch (error) {
      setStatus(`Failed to get Debank portfolio: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchSafeOpportunities = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching safe opportunities…");
      const response = await sdk!.getSafeOpportunities(selectedChain);
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
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching degen strategies…");
      const response = await sdk!.getDegenStrategies(selectedChain);
      setDegenStrategies(response);
      setStatus(`Loaded ${response.data.length} degen strategies.`);
    } catch (error) {
      setStatus(`Failed to get degen strategies: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchApyHistory = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching APY history…");
      const response = await sdk!.getDailyApyHistory(
        walletInfo.address,
        apyHistoryDays
      );
      setApyHistory(response);
      setStatus(
        `APY history loaded. Average: ${
          response.averageWeightedApy?.toFixed(2) ?? 0
        }%`
      );
    } catch (error) {
      setStatus(`Failed to get APY history: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchRebalanceInfo = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching rebalance info…");
      const response = await sdk!.getRebalanceInfo();
      setRebalanceInfo(response);
      setStatus(`Loaded ${response.count} rebalance events.`);
    } catch (error) {
      setStatus(`Failed to get rebalance info: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchRebalanceFrequency = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching rebalance frequency…");
      const response = await sdk!.getRebalanceFrequency(walletInfo.address);
      setRebalanceFrequency(response);
      setStatus(
        `Rebalance tier: ${response.tier}, frequency: ${response.frequency}/day`
      );
    } catch (error) {
      setStatus(
        `Failed to get rebalance frequency: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const clearAllState = () => {
    disconnect();
    setProtocols([]);
    setPositions([]);
    setWalletInfo(null);
    setDeploymentResult(null);
    setSessionInfo(null);
    setDepositToken("");
    setDepositAmount("");
    setDepositResult(null);
    setWithdrawAmount("");
    setWithdrawReceiver("");
    setWithdrawResult(null);
    setUserDetails(null);
    setTvlData(null);
    setVolumeData(null);
    setActiveWallets(null);
    setSmartWalletByEoa(null);
    setFirstTopup(null);
    setHistory(null);
    setOnchainEarnings(null);
    setDailyEarnings(null);
    setDebankPortfolio(null);
    setSafeOpportunities(null);
    setDegenStrategies(null);
    setApyHistory(null);
    setRebalanceInfo(null);
    setRebalanceFrequency(null);
    setSelectedProtocols([]);
    setStatus("Wallet disconnected.");
  };

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
            onChange={(event) => {
              const next = Number(event.target.value);
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
          <button onClick={fetchProtocols} disabled={isBusy}>
            Fetch Protocols
          </button>
          <button onClick={fetchPositions} disabled={isBusy || !address}>
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
              // Chain can be at bundle level or derived from first position
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
          <button onClick={resolveSmartWallet} disabled={isBusy || !address}>
            Resolve Smart Wallet
          </button>
          <button onClick={deploySafe} disabled={isBusy || !address}>
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

        {deploymentResult && (
          <div className="callout">
            <div>
              <strong>Last Deployment</strong>
            </div>
            <p>
              Status: {deploymentResult.status} · Tx:{" "}
              <a
                href={getExplorerUrl(selectedChain, deploymentResult.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {truncate(deploymentResult.txHash, 10)}
              </a>
            </p>
          </div>
        )}
      </section>

      {/* =============================== SESSION KEY =============================== */}
      <section className="panel">
        <h2>Session Key</h2>
        <p>
          The demo uses the SDK&apos;s `createSessionKey` helper to fetch
          config, sign, and register a session in one click.
        </p>
        <div className="control-buttons">
          <button onClick={createSessionKey} disabled={isBusy || !address}>
            Create Session Key
          </button>
        </div>

        {sessionInfo ? (
          <div className="detail-grid">
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
                {sessionInfo.sessionActivation?.isActive ||
                userDetails?.user?.hasActiveSessionKey
                  ? "Active"
                  : "Pending"}
              </strong>
            </div>
          </div>
        ) : (
          <p className="empty">Generate a session to view its metadata.</p>
        )}
      </section>

      {/* =============================== USER DETAILS =============================== */}
      <section className="panel">
        <h2>User Details</h2>
        <p>
          Fetch authenticated user details including smart wallet, chains, and
          protocol settings. Update profile to link your Smart Wallet before
          creating session keys.
        </p>
        <div className="control-buttons">
          <button onClick={fetchUserDetails} disabled={isBusy || !address}>
            Get User Details
          </button>
          <button
            onClick={updateUserProfile}
            disabled={isBusy || !address || !walletInfo?.address}
            title={
              !walletInfo?.address
                ? "Resolve Smart Wallet first"
                : "Update profile with Smart Wallet address"
            }
          >
            Update Profile
          </button>
        </div>

        {userDetails?.user ? (
          <div className="detail-grid">
            <div className="detail-row">
              <span>User ID</span>
              <code>{userDetails.user.id}</code>
            </div>
            <div className="detail-row">
              <span>Address</span>
              <code>{truncate(userDetails.user.address, 10)}</code>
            </div>
            <div className="detail-row">
              <span>Smart Wallet</span>
              <code>{truncate(userDetails.user.smartWallet, 10)}</code>
            </div>
            <div className="detail-row">
              <span>Chains</span>
              <strong>
                {userDetails.user.chains?.map(formatChainName).join(", ") ||
                  "None"}
              </strong>
            </div>
            <div className="detail-row">
              <span>Strategy</span>
              <strong>{userDetails.user.strategy || "Default"}</strong>
            </div>
            <div className="detail-row">
              <span>Active Session Key</span>
              <strong>
                {userDetails.user.hasActiveSessionKey ? "Yes" : "No"}
              </strong>
            </div>
            <div className="detail-row">
              <span>Auto Select Protocols</span>
              <strong>
                {userDetails.user.autoSelectProtocols ? "Yes" : "No"}
              </strong>
            </div>
            <div className="detail-row">
              <span>Omni Account</span>
              <strong>{userDetails.user.omniAccount ? "Yes" : "No"}</strong>
            </div>
            <div className="detail-row">
              <span>Cross-chain Strategy</span>
              <strong>
                {userDetails.user.crosschainStrategy ? "Yes" : "No"}
              </strong>
            </div>
          </div>
        ) : (
          <p className="empty">Fetch user details to view profile.</p>
        )}
      </section>

      {/* =============================== PROTOCOL MANAGEMENT =============================== */}
      <section className="panel">
        <h2>Protocol Management</h2>
        <p>
          Select specific protocols to use for yield optimization. When
          protocols are selected, only these will be used for your positions.
        </p>
        <div className="control-buttons">
          <button onClick={fetchProtocols} disabled={isBusy}>
            Load Available Protocols
          </button>
          <button
            onClick={updateProtocols}
            disabled={isBusy || !address || selectedProtocols.length === 0}
            title={
              selectedProtocols.length === 0
                ? "Select at least one protocol"
                : "Update your protocol preferences"
            }
          >
            Update Protocols ({selectedProtocols.length} selected)
          </button>
        </div>

        {protocols.length > 0 ? (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>Select Protocols ({protocols.length} available)</strong>
            {protocols.map((protocol) => {
              const isSelected = selectedProtocols.includes(protocol.id);
              return (
                <article
                  key={protocol.id}
                  style={{
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#2d3748" : undefined,
                    border: isSelected ? "2px solid #4299e1" : undefined,
                  }}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedProtocols(
                        selectedProtocols.filter((id) => id !== protocol.id)
                      );
                    } else {
                      setSelectedProtocols([...selectedProtocols, protocol.id]);
                    }
                  }}
                >
                  <header>
                    <div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          // Handled by parent onClick
                        }}
                        style={{ marginRight: "10px", cursor: "pointer" }}
                      />
                      <strong>{protocol.name}</strong>
                      <span> | {protocol.type}</span>
                    </div>
                    <small>
                      Chains: {protocol.chains.map(formatChainName).join(", ")}
                    </small>
                  </header>
                  <p>{protocol.description ?? "No description provided."}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty">
            Load protocols to select and update your preferences.
          </p>
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
          <button onClick={fetchTVL} disabled={isBusy}>
            Get TVL
          </button>
          <button onClick={fetchVolume} disabled={isBusy}>
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

      {/* =============================== ACTIVE WALLETS =============================== */}
      <section className="panel">
        <h2>Active Wallets</h2>
        <p>Get active smart wallets on the selected chain.</p>
        <div className="control-buttons">
          <button onClick={fetchActiveWallets} disabled={isBusy}>
            Get Active Wallets
          </button>
          {/* <button onClick={fetchSmartWalletByEoa} disabled={isBusy || !address}>
            Get My Smart Wallet
          </button> */}
        </div>

        {activeWallets && (
          <div className="callout">
            <strong>
              Active Wallets on {formatChainName(activeWallets.chainId)}
            </strong>
            <p>Count: {activeWallets.count}</p>
            {activeWallets.wallets.slice(0, 5).map((w, i) => (
              <div key={i}>
                <code>{truncate(w.smartWallet, 12)}</code> · Chains:{" "}
                {w.chains.map(formatChainName).join(", ")}
              </div>
            ))}
            {activeWallets.count > 5 && (
              <p className="empty">...and {activeWallets.count - 5} more</p>
            )}
          </div>
        )}

        {smartWalletByEoa && (
          <div className="detail-grid" style={{ marginTop: "1rem" }}>
            <div className="detail-row">
              <span>EOA</span>
              <code>{truncate(smartWalletByEoa.eoa, 10)}</code>
            </div>
            <div className="detail-row">
              <span>Smart Wallet</span>
              <code>
                {smartWalletByEoa.smartWallet
                  ? truncate(smartWalletByEoa.smartWallet, 10)
                  : "None"}
              </code>
            </div>
            <div className="detail-row">
              <span>Chains</span>
              <strong>
                {smartWalletByEoa.chains.map(formatChainName).join(", ") ||
                  "None"}
              </strong>
            </div>
          </div>
        )}
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

        {depositResult && (
          <div className="callout">
            <div>
              <strong>Last Deposit</strong>
            </div>
            <p>
              Status: {depositResult.status} · Amount: {depositResult.amount} ·
              Tx:{" "}
              <a
                href={getExplorerUrl(selectedChain, depositResult.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {truncate(depositResult.txHash, 10)}
              </a>
            </p>
          </div>
        )}
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

        {withdrawResult && (
          <div className="callout">
            <div>
              <strong>Last Withdraw</strong>
            </div>
            <p>
              Type: {withdrawResult.type} · Amount: {withdrawResult.amount} ·
              Receiver: {truncate(withdrawResult.receiver, 8)} ·
            </p>
          </div>
        )}
      </section>

      {/* =============================== FIRST TOPUP & HISTORY =============================== */}
      <section className="panel">
        <h2>First Topup & History</h2>
        <p>
          Get the first deposit date and transaction history for your smart
          wallet.
        </p>
        <div className="control-buttons">
          <button
            onClick={fetchFirstTopup}
            disabled={isBusy || !walletInfo?.address}
          >
            Get First Topup
          </button>
          <button
            onClick={fetchHistory}
            disabled={isBusy || !walletInfo?.address}
          >
            Get History
          </button>
        </div>

        {firstTopup && (
          <div className="detail-grid">
            <div className="detail-row">
              <span>First Topup Date</span>
              <strong>{firstTopup.date || "N/A"}</strong>
            </div>
            {firstTopup.amount && (
              <div className="detail-row">
                <span>Amount</span>
                <strong>{firstTopup.amount}</strong>
              </div>
            )}
          </div>
        )}

        {history && history.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>Transaction History ({history.total} total)</strong>
            {history.data.slice(0, 10).map((entry, i) => (
              <article key={entry.id || i}>
                <header>
                  <div>
                    <strong>{entry.action || "Transaction"}</strong>
                    {entry.strategy && <span> | {entry.strategy}</span>}
                  </div>
                  <small>{entry.date || "Unknown date"}</small>
                </header>
                {entry.transactionHash && (
                  <code>{truncate(entry.transactionHash, 12)}</code>
                )}
                {entry.rebalance && <span className="badge">Rebalance</span>}
                {entry.crosschain && <span className="badge">Cross-chain</span>}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =============================== ONCHAIN EARNINGS =============================== */}
      <section className="panel">
        <h2>Onchain Earnings</h2>
        <p>Get and calculate earnings for your smart wallet.</p>
        <div className="control-buttons">
          <button
            onClick={fetchOnchainEarnings}
            disabled={isBusy || !walletInfo?.address}
          >
            Get Onchain Earnings
          </button>
          <button
            onClick={calculateEarnings}
            disabled={isBusy || !walletInfo?.address}
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

      {/* =============================== DAILY EARNINGS =============================== */}
      <section className="panel">
        <h2>Daily Earnings</h2>
        <p>Get daily earnings breakdown for a date range.</p>
        <div className="form-grid">
          <label className="form-field">
            <span>Start Date (optional)</span>
            <input
              type="date"
              value={earningsStartDate}
              onChange={(e) => setEarningsStartDate(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>End Date (optional)</span>
            <input
              type="date"
              value={earningsEndDate}
              onChange={(e) => setEarningsEndDate(e.target.value)}
            />
          </label>
        </div>
        <div className="control-buttons" style={{ marginTop: "1rem" }}>
          <button
            onClick={fetchDailyEarnings}
            disabled={isBusy || !walletInfo?.address}
          >
            Get Daily Earnings
          </button>
        </div>

        {dailyEarnings && dailyEarnings.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>Daily Breakdown ({dailyEarnings.count} entries)</strong>
            {dailyEarnings.data.slice(0, 10).map((entry, i) => (
              <article key={i}>
                <header>
                  <div>
                    <strong>{entry.snapshot_date}</strong>
                  </div>
                  <small>
                    Daily Delta: {formatUsd(entry.daily_total_delta)}
                  </small>
                </header>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span>Total</span>
                    <strong>{formatUsd(entry.total_earnings)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Current</span>
                    <strong>{formatUsd(entry.total_current_earnings)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Lifetime</span>
                    <strong>{formatUsd(entry.total_lifetime_earnings)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =============================== APY HISTORY =============================== */}
      <section className="panel">
        <h2>Daily APY History</h2>
        <p>Get weighted APY history for your wallet.</p>
        <div className="form-grid">
          <label className="form-field">
            <span>Period</span>
            <select
              value={apyHistoryDays}
              onChange={(e) =>
                setApyHistoryDays(e.target.value as "7D" | "14D" | "30D")
              }
            >
              <option value="7D">7 Days</option>
              <option value="14D">14 Days</option>
              <option value="30D">30 Days</option>
            </select>
          </label>
        </div>
        <div className="control-buttons" style={{ marginTop: "1rem" }}>
          <button
            onClick={fetchApyHistory}
            disabled={isBusy || !walletInfo?.address}
          >
            Get APY History
          </button>
        </div>

        {apyHistory && (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Average Weighted APY</span>
              <span className="stat-value">
                {apyHistory.averageWeightedApy?.toFixed(2) ?? 0}%
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Days</span>
              <span className="stat-value">{apyHistory.totalDays}</span>
            </div>
          </div>
        )}

        {apyHistory?.history && Object.keys(apyHistory.history).length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>Daily APY</strong>
            {Object.entries(apyHistory.history)
              .slice(0, 10)
              .map(([date, entry]) => (
                <article key={date}>
                  <header>
                    <div>
                      <strong>{date}</strong>
                    </div>
                    <small>
                      APY: {(entry.apy ?? entry.weightedApy ?? 0).toFixed(2)}%
                    </small>
                  </header>
                </article>
              ))}
          </div>
        )}
      </section>

      {/* =============================== PORTFOLIO =============================== */}
      <section className="panel">
        <h2>Debank Portfolio</h2>
        <p>
          Get multi-chain portfolio data from Debank (may require
          authorization).
        </p>
        <div className="control-buttons">
          <button
            onClick={fetchDebankPortfolio}
            disabled={isBusy || !walletInfo?.address}
          >
            Get Debank Portfolio
          </button>
        </div>

        {debankPortfolio && (
          <>
            {(() => {
              // Calculate total from chain data if totalValueUsd is not provided
              const chainEntries = debankPortfolio.chains
                ? Object.entries(debankPortfolio.chains)
                : [];
              const calculatedTotal = chainEntries.reduce(
                (sum, [, chainData]) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const data = chainData as any;
                  const value =
                    data.totalValueUsd ?? data.summary?.totalValue ?? 0;
                  return sum + (typeof value === "number" ? value : 0);
                },
                0
              );
              const totalValue =
                debankPortfolio.totalValueUsd || calculatedTotal;

              return (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-label">Total Portfolio Value</span>
                      <span className="stat-value">
                        {formatUsd(totalValue)}
                      </span>
                    </div>
                  </div>
                  {chainEntries.length > 0 && (
                    <div className="list" style={{ marginTop: "1rem" }}>
                      <strong>By Chain</strong>
                      {chainEntries.map(([chainKey, chainData]) => {
                        // Handle both possible response structures:
                        // 1. { chainName, chainId, totalValueUsd } - legacy format
                        // 2. { tokens, summary: { totalValue } } - debank format where chainKey is the chain name
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const data = chainData as any;
                        const chainName =
                          data.chainName ||
                          chainKey.charAt(0).toUpperCase() + chainKey.slice(1);
                        const chainValue =
                          data.totalValueUsd ?? data.summary?.totalValue ?? 0;

                        return (
                          <article key={chainKey}>
                            <header>
                              <div>
                                <strong>{chainName}</strong>
                              </div>
                              <small>{formatUsd(chainValue)}</small>
                            </header>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </section>

      {/* =============================== OPPORTUNITIES =============================== */}
      <section className="panel">
        <h2>Yield Opportunities</h2>
        <p>Explore safe and degen yield strategies on the selected chain.</p>
        <div className="control-buttons">
          <button onClick={fetchSafeOpportunities} disabled={isBusy}>
            Get Safe Opportunities
          </button>
          <button onClick={fetchDegenStrategies} disabled={isBusy}>
            Get Degen Strategies
          </button>
        </div>

        {safeOpportunities && safeOpportunities.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>
              Safe Opportunities ({safeOpportunities.data.length})
            </strong>
            {safeOpportunities.data.slice(0, 5).map((opp) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = opp as any;
              const protocolName =
                data.protocolName || data.protocol_name || "Protocol";
              const poolName = data.poolName || data.pool_name || "Pool";
              const apy = data.apy || data.pool_apy || data.combined_apy || 0;
              const chainId = data.chainId || data.chain_id;

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = strat as any;
              const protocolName =
                data.protocolName || data.protocol_name || "Protocol";
              const poolName = data.poolName || data.pool_name || "Pool";
              const apy = data.apy || data.pool_apy || data.combined_apy || 0;
              const chainId = data.chainId || data.chain_id;
              const strategyType = data.strategy_type || data.strategyType;

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

      {/* =============================== REBALANCE =============================== */}
      <section className="panel">
        <h2>Rebalance</h2>
        <p>Get rebalance events and frequency tier for your wallet.</p>
        <div className="control-buttons">
          <button onClick={fetchRebalanceInfo} disabled={isBusy}>
            Get Rebalance Info
          </button>
          <button
            onClick={fetchRebalanceFrequency}
            disabled={isBusy || !walletInfo?.address}
          >
            Get Rebalance Frequency
          </button>
        </div>

        {rebalanceFrequency && (
          <div className="detail-grid">
            <div className="detail-row">
              <span>Tier</span>
              <strong>{rebalanceFrequency.tier}</strong>
            </div>
            <div className="detail-row">
              <span>Frequency</span>
              <strong>{rebalanceFrequency.frequency}/day</strong>
            </div>
            {rebalanceFrequency.description && (
              <div className="detail-row">
                <span>Description</span>
                <span>{rebalanceFrequency.description}</span>
              </div>
            )}
          </div>
        )}

        {rebalanceInfo && rebalanceInfo.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>Recent Rebalances ({rebalanceInfo.count})</strong>
            {rebalanceInfo.data.slice(0, 5).map((r, idx) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rebalance = r as any;
              const chainId = rebalance.chainId ?? rebalance.chain_id;
              const totalRebalances =
                rebalance.totalRebalances ?? rebalance.total_rebalances;
              const sameChainRebalances =
                rebalance.sameChainRebalances ??
                rebalance.same_chain_rebalances;
              const crossChainRebalances =
                rebalance.crossChainRebalances ??
                rebalance.cross_chain_rebalances;
              const avgApy = rebalance.averageApy ?? rebalance.average_apy;

              return (
                <article key={r.id || idx}>
                  <header>
                    <div>
                      <strong>
                        {chainId ? formatChainName(chainId) : "Multi-chain"}
                      </strong>
                      {totalRebalances != null && (
                        <span> · {totalRebalances} rebalances</span>
                      )}
                    </div>
                    <small>
                      {r.timestamp
                        ? new Date(r.timestamp).toLocaleString()
                        : "N/A"}
                    </small>
                  </header>
                  <div className="detail-grid" style={{ marginTop: "0.5rem" }}>
                    {rebalance.amount != null && (
                      <div className="detail-row">
                        <span>Amount</span>
                        <strong>
                          {formatUsd(Number(rebalance.amount) / 1e6)}
                        </strong>
                      </div>
                    )}
                    {avgApy != null && (
                      <div className="detail-row">
                        <span>Avg APY</span>
                        <strong>{Number(avgApy).toFixed(2)}%</strong>
                      </div>
                    )}
                    {sameChainRebalances != null && (
                      <div className="detail-row">
                        <span>Same-chain</span>
                        <strong>{String(sameChainRebalances)}</strong>
                      </div>
                    )}
                    {crossChainRebalances != null &&
                      Number(crossChainRebalances) > 0 && (
                        <div className="detail-row">
                          <span>Cross-chain</span>
                          <strong>{String(crossChainRebalances)}</strong>
                        </div>
                      )}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    {rebalance.isCrossChain && (
                      <span className="badge">Cross-chain</span>
                    )}
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

export default App;
