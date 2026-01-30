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
  APYPerStrategyResponse,
  RebalanceFrequencyResponse,
  SdkKeyTVLResponse,
  BestOpportunityResponse,
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
    case "146":
      return "Sonic";
    default:
      return `Chain ${id}`;
  }
};

const filterSupportedChains = (chains: (string | number)[]) => {
  return chains.filter((chain) => {
    const chainId = String(chain);
    return chainId === "8453" || chainId === "42161" || chainId === "9745";
  });
};

const getExplorerUrl = (chainId: string | number, txHash: string) => {
  const id = String(chainId);
  switch (id) {
    case "8453":
      return `https://basescan.org/tx/${txHash}`;
    case "42161":
      return `https://arbiscan.io/tx/${txHash}`;
    case "9745":
      return `https://plasmascan.to/tx/${txHash}`;
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
  const [depositAmount, setDepositAmount] = useState("");
  const [depositResult, setDepositResult] = useState<DepositResponse | null>(
    null
  );

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
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
  const [apyPerStrategy, setApyPerStrategy] =
    useState<APYPerStrategyResponse | null>(null);

  const [rebalanceFrequency, setRebalanceFrequency] =
    useState<RebalanceFrequencyResponse | null>(null);

  // SDK Key methods state
  const [sdkAllowedWallets, setSdkAllowedWallets] = useState<{
    success: boolean;
    allowedWallets: string[];
    metadata: {
      sdkKeyId: string;
      clientName: string;
      walletsCount: number;
    };
  } | null>(null);
  const [sdkKeyTvl, setSdkKeyTvl] = useState<SdkKeyTVLResponse | null>(null);
  const [bestOpportunity, setBestOpportunity] =
    useState<BestOpportunityResponse | null>(null);
  // Read-only lookup state (no wallet connection required)
  const [lookupAddress, setLookupAddress] = useState("");

  // Additional input states
  const [earningsStartDate, setEarningsStartDate] = useState("");
  const [earningsEndDate, setEarningsEndDate] = useState("");
  const [apyHistoryDays, setApyHistoryDays] = useState<"7D" | "14D" | "30D">(
    "7D"
  );
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);

  const sdk = useMemo(() => {
    const apiKey = import.meta.env.VITE_ZYFAI_API_KEY;

    if (!apiKey) {
      console.warn("Set VITE_ZYFAI_API_KEY to use the SDK.");
      return null;
    }

    return new ZyfaiSDK({
      apiKey,
    });
  }, []);

  useEffect(() => {
    if (!sdk || !walletClient || !address) return;

    let active = true;

    setStatus("Linking Reown wallet to Zyfai SDK…");
    sdk
      .connectAccount(
        walletClient,
        walletClient.chain?.id as SupportedChainId | undefined
      )
      .then(() => {
        if (active) setStatus("Wallet ready. You can now fetch Zyfai data.");
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
      setStatus("Missing env vars. Update VITE_ZYFAI_API_KEY.");
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
      setStatus("Fetching Zyfai positions…");
      const response = await sdk!.getPositions(address!, selectedChain);
      console.log("response", response);
      const positionsArray = response.positions ?? [];
      setPositions(positionsArray);
      if (positionsArray.length === 0) {
        setStatus("No active positions found.");
      } else if (
        positionsArray.some(
          (position) =>
            position.positions === null || position.positions?.length === 0
        )
      ) {
        setStatus("No positions found.");
      } else {
        setStatus(`Loaded ${positionsArray.length} position bundles.`);
      }
    } catch (error) {
      setStatus(`Failed to load positions: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  /**
   * Read-only: fetch positions for any EOA address without requiring wallet connection
   */
  const fetchPositionsForAddress = async () => {
    if (!ensureSdk()) return;
    const targetAddress = lookupAddress.trim() || address;

    if (!targetAddress) {
      setStatus("Enter a wallet address to fetch positions.");
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Fetching Zyfai positions (read-only) …");
      const response = await sdk!.getPositions(
        targetAddress,
        selectedChain
      );
      const positionsArray = response.positions ?? [];
      setPositions(positionsArray);
      if (positionsArray.length === 0) {
        setStatus("No active positions found for this address.");
      } else if (
        positionsArray.some(
          (position) =>
            position.positions === null || position.positions?.length === 0
        )
      ) {
        setStatus("No positions found for this address.");
      } else {
        setStatus(
          `Loaded ${positionsArray.length} position bundles for ${truncate(
            targetAddress
          , 6)}.`
        );
      }
    } catch (error) {
      setStatus(
        `Failed to load positions for address: ${
          (error as Error).message
        }`
      );
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
      const response = await sdk!.deploySafe(
        address!,
        selectedChain,
        "aggressive"
      );
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
      setStatus("Session key registered with Zyfai API.");
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
    if (!depositAmount || depositAmount === "0") {
      setStatus(
        "Please enter a valid deposit amount (in least decimal units)."
      );
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Depositing funds to Zyfai…");
      const response = await sdk!.depositFunds(
        address!,
        selectedChain,
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
          ? "Withdrawing all funds from Zyfai…"
          : `Withdrawing ${withdrawAmount} from Zyfai…`
      );
      const response = await sdk!.withdrawFunds(
        address!,
        selectedChain,
        withdrawAmount || undefined
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

  const updateUserStrategy = async (
    nextStrategy: "conservative" | "aggressive"
  ) => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus(`Updating strategy to ${nextStrategy}…`);
      await sdk!.updateUserProfile({
        strategy: nextStrategy,
      });
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
      setStatus(`Strategy updated to ${nextStrategy}.`);
    } catch (error) {
      setStatus(`Failed to update strategy: ${(error as Error).message}`);
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

  const fetchApyPerStrategy = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching APY per strategy…");
      const response = await sdk!.getAPYPerStrategy(false, 7, 'conservative');
      setApyPerStrategy(response);
    } catch (error) {
      setStatus(`Failed to get APY per strategy: ${(error as Error).message}`);
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
      setStatus("Fetching conservative opportunities…");
      const response = await sdk!.getConservativeOpportunities(selectedChain);
      setSafeOpportunities(response);
      setStatus(`Loaded ${response.data.length} conservative opportunities.`);
    } catch (error) {
      setStatus(
        `Failed to get conservative opportunities: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const fetchDegenStrategies = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching aggressive opportunities…");
      const response = await sdk!.getAggressiveOpportunities(selectedChain);
      setDegenStrategies(response);
      setStatus(`Loaded ${response.data.length} aggressive opportunities.`);
    } catch (error) {
      setStatus(`Failed to get aggressive opportunities: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchApyHistory = async () => {
    try {
      setIsBusy(true);
      setStatus("Fetching APY history…");
      const response = await sdk!.getDailyApyHistory(
        walletInfo?.address ?? "",
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

  /**
   * Read-only: resolve Safe and fetch APY history for any EOA address
   */
  const fetchApyHistoryForAddress = async () => {
    if (!ensureSdk()) return;
    const targetAddress = lookupAddress.trim() || address;

    if (!targetAddress) {
      setStatus("Enter a wallet address to fetch APY history.");
      return;
    }

    try {
      setIsBusy(true);
      setStatus("Resolving smart wallet and fetching APY history…");
      const smartWallet = await sdk!.getSmartWalletAddress(
        targetAddress,
        selectedChain
      );
      setWalletInfo(smartWallet);

      const response = await sdk!.getDailyApyHistory(
        smartWallet.address,
        apyHistoryDays
      );
      setApyHistory(response);
      setStatus(
        `APY history loaded. Average: ${
          response.averageWeightedApy?.toFixed(2) ?? 0
        }%`
      );
    } catch (error) {
      setStatus(
        `Failed to get APY history for address: ${
          (error as Error).message
        }`
      );
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

  // ============================================================================
  // SDK Key Methods
  // ============================================================================

  const fetchSdkAllowedWallets = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching SDK allowed wallets…");
      const response = await sdk!.getSdkAllowedWallets();
      setSdkAllowedWallets(response);
      setStatus(
        `Loaded ${response.metadata.walletsCount} allowed wallet(s) for SDK key: ${response.metadata.clientName}`
      );
    } catch (error) {
      setStatus(
        `Failed to get SDK allowed wallets: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const fetchSdkKeyTvl = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching SDK key TVL…");
      const response = await sdk!.getSdkKeyTVL();
      setSdkKeyTvl(response);
      setStatus(
        `Loaded TVL for ${response.metadata?.walletsCount || 0} wallet(s). Total: ${formatUsd(response.totalTvl)}`
      );
    } catch (error) {
      setStatus(`Failed to get SDK key TVL: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchBestOpportunity = async () => {
    if (!ensureSdk()) return;
    if (!walletInfo?.address) {
      setStatus("Please get Smart Wallet address first");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching best opportunity…");
      const response = await sdk!.getBestOpportunity(
        walletInfo.address as `0x${string}`,
        selectedChain
      );
      setBestOpportunity(response);
      if (response.success && response.bestOpportunity) {
        setStatus(
          `Best opportunity: ${response.bestOpportunity.protocol} - ${response.bestOpportunity.pool} (${response.bestOpportunity.apy.toFixed(2)}% APY)`
        );
      } else {
        setStatus(response.error || "No opportunities found");
      }
    } catch (error) {
      setStatus(`Failed to get best opportunity: ${(error as Error).message}`);
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
    setDepositAmount("");
    setDepositResult(null);
    setWithdrawAmount("");
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
    setRebalanceFrequency(null);
    setApyPerStrategy(null);
    setSdkAllowedWallets(null);
    setSdkKeyTvl(null);
    setBestOpportunity(null);
    setSelectedProtocols([]);
    setStatus("Wallet disconnected.");
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1>Zyfai SDK + Reown AppKit</h1>
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
        <div className="control-buttons">
          <button
            onClick={() => updateUserStrategy("conservative")}
            disabled={isBusy || !address}
          >
            Set Conservative Strategy
          </button>
          <button
            onClick={() => updateUserStrategy("aggressive")}
            disabled={isBusy || !address}
          >
            Set Aggressive Strategy
          </button>
        </div>
        </div>

        {userDetails?.user ? (
          <div className="detail-grid">
            <div className="detail-row">
              <span>Address</span>
              <code>{userDetails.user.address}</code>
            </div>
            <div className="detail-row">
              <span>Smart Wallet</span>
              <code>{userDetails.user.smartWallet}</code>
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


      {/* =========================== READ-ONLY ADDRESS LOOKUP =========================== */}
      <section className="panel">
        <h2>Read-only Address Lookup</h2>
        <p>
          Fetch positions and APY for any wallet address using the Zyfai Data
          API. No wallet connection or signing required.
        </p>
        <div className="controls">
          <label>
            Wallet Address
            <input
              type="text"
              placeholder="0x..."
              value={lookupAddress}
              onChange={(event) => setLookupAddress(event.target.value)}
            />
          </label>
          <div className="control-buttons">
            <button onClick={fetchPositionsForAddress} disabled={isBusy}>
              Fetch Positions
            </button>
            <button onClick={fetchApyHistoryForAddress} disabled={isBusy}>
              Fetch APY History
            </button>
          </div>
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

      {/* =============================== POSITIONS =============================== */}
      <section className="panel">
        <h2>Positions</h2>
        {positions.length === 0 ? (
          <p className="empty">No active positions found.</p>
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
                          <li>Position: {underlying / 1e6}</li>
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

      {/* =============================== PROTOCOLS =============================== */}
      <section className="panel">
        <h2>Protocols</h2>
        {protocols.length === 0 ? (
          <p className="empty">No protocol data loaded yet.</p>
        ) : (
          <div className="list">
            {protocols.map((protocol) => {
              const poolCount = protocol.pools?.length ?? 0;
              const supportedChains = filterSupportedChains(protocol.chains);
              return (
                <article key={protocol.id}>
                  <header>
                    <div>
                      <strong>{protocol.name}</strong>
                      <span> | {protocol.type}</span>
                    </div>
                    <small>
                      Chains: {supportedChains.map(formatChainName).join(", ")}
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
              const supportedChains = filterSupportedChains(protocol.chains);
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
                      Chains: {supportedChains.map(formatChainName).join(", ")}
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

      {/* =============================== DEPOSIT =============================== */}
      <section className="panel">
        <h2>Deposit Funds</h2>
        <p>
          Transfer tokens into your Zyfai smart wallet for yield optimization.
          The token address is automatically selected based on the chain (USDC
          for Base/Arbitrum, USDT for Plasma). Amounts are in least decimal
          units (e.g., 1 USDC = 1000000).
        </p>

        <div className="form-grid">
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
            disabled={isBusy || !address || !depositAmount}
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
              Amount: {depositResult.amount} · Tx:{" "}
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
          Withdraw funds from your Zyfai smart wallet. Leave amount empty for a
          full withdrawal. Funds will be sent to your EOA.
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
              Type: {withdrawResult.type} · Amount: {withdrawResult.amount}
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
        <p>Explore conservative and aggressive yield opportunities on the selected chain.</p>
        <div className="control-buttons">
          <button onClick={fetchSafeOpportunities} disabled={isBusy}>
            Get Conservative Opportunities
          </button>
          <button onClick={fetchDegenStrategies} disabled={isBusy}>
            Get Aggressive Opportunities
          </button>
        </div>

        {safeOpportunities && safeOpportunities.data.length > 0 && (
          <div className="list" style={{ marginTop: "1rem" }}>
            <strong>
              Conservative Opportunities ({safeOpportunities.data.length})
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
            <strong>Aggressive Opportunities ({degenStrategies.data.length})</strong>
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
        <p>Get rebalance frequency tier for your wallet.</p>
        <div className="control-buttons">
          <button
            onClick={fetchRebalanceFrequency}
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
      </section>

      {/* =============================== TVL & VOLUME =============================== */}
      <section className="panel">
        <h2>Platform Stats (TVL & Volume)</h2>
        <p>
          Get total value locked and transaction volume across all Zyfai
          accounts.
        </p>
        <div className="control-buttons">
          <button onClick={fetchApyPerStrategy} disabled={isBusy}>
            Get APY per Strategy
          </button>
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
          {apyPerStrategy && (
            <div className="stat-card">
              <span className="stat-label">APY per Strategy Without Fees (7D)</span>
              <div className="stat-breakdown">
                {apyPerStrategy.data.map((chain) => (
                  <div key={chain.chain_id}>
                    {formatChainName(chain.chain_id)} -{" "}
                    {chain.average_apy_without_fee.toFixed(2)}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =============================== SDK KEY METHODS =============================== */}
      <section className="panel">
        <h2>SDK Key Information</h2>
        <p>
          Get allowed wallets and total TVL for your SDK API key. No wallet
          connection required.
        </p>
        <div className="control-buttons">
          <button onClick={fetchSdkAllowedWallets} disabled={isBusy}>
            Get Allowed Wallets
          </button>
          <button onClick={fetchSdkKeyTvl} disabled={isBusy}>
            Get SDK Key TVL
          </button>
        </div>

        {sdkAllowedWallets && (
          <div className="callout">
            <strong>SDK Key: {sdkAllowedWallets.metadata.clientName}</strong>
            <div className="detail-grid" style={{ marginTop: "1rem" }}>
              <div className="detail-row">
                <span>SDK Key ID</span>
                <code>{truncate(sdkAllowedWallets.metadata.sdkKeyId, 12)}</code>
              </div>
              <div className="detail-row">
                <span>Total Wallets</span>
                <strong>{sdkAllowedWallets.metadata.walletsCount}</strong>
              </div>
            </div>
            {sdkAllowedWallets.allowedWallets.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <strong>Allowed Wallets:</strong>
                <div className="list" style={{ marginTop: "0.5rem" }}>
                  {sdkAllowedWallets.allowedWallets
                    .slice(0, 10)
                    .map((wallet, i) => (
                      <div key={i} style={{ padding: "0.5rem 0" }}>
                        <code>{truncate(wallet, 12)}</code>
                      </div>
                    ))}
                  {sdkAllowedWallets.allowedWallets.length > 10 && (
                    <p className="empty">
                      ...and {sdkAllowedWallets.allowedWallets.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {sdkKeyTvl && (
          <div className="callout" style={{ marginTop: "1rem" }}>
            <strong>
              SDK TVL: {sdkKeyTvl.metadata?.clientName || "Unknown"}
            </strong>
            <div className="detail-grid" style={{ marginTop: "1rem" }}>
              <div className="detail-row">
                <span>Total Wallets</span>
                <strong>{sdkKeyTvl.metadata?.walletsCount || 0}</strong>
              </div>
              <div className="detail-row">
                <span>Total TVL</span>
                <strong>{formatUsd(sdkKeyTvl.totalTvl)}</strong>
              </div>
            </div>

            {sdkKeyTvl.tvlByWallet && sdkKeyTvl.tvlByWallet.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <strong>TVL by Wallet (Top 5):</strong>
                <div className="list" style={{ marginTop: "0.5rem" }}>
                  {sdkKeyTvl.tvlByWallet
                    .sort((a, b) => b.tvl - a.tvl)
                    .slice(0, 5)
                    .map((wallet, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <code>{truncate(wallet.walletAddress, 12)}</code>
                          <strong>{formatUsd(wallet.tvl)}</strong>
                        </div>
                        {wallet.positions && wallet.positions.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              opacity: 0.8,
                              marginTop: "0.5rem",
                            }}
                          >
                            <div>Positions:</div>
                            {wallet.positions.map((pos, j) => (
                              <div
                                key={j}
                                style={{
                                  paddingLeft: "1rem",
                                  marginTop: "0.25rem",
                                }}
                              >
                                • {formatChainName(pos.chainId)}: {pos.protocol}{" "}
                                - {formatUsd(pos.amount)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                {sdkKeyTvl.tvlByWallet.length > 5 && (
                  <p className="empty" style={{ marginTop: "0.5rem" }}>
                    ...and {sdkKeyTvl.tvlByWallet.length - 5} more wallet(s)
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* =============================== BEST OPPORTUNITY =============================== */}
      <section className="panel">
        <h2>Best Opportunity</h2>
        <p>
          Get the best yield opportunity for your smart wallet based on your
          strategy and enabled protocols.
        </p>
        <div className="actions">
          <button
            onClick={fetchBestOpportunity}
            disabled={isBusy || !walletInfo?.address}
          >
            Get Best Opportunity
          </button>
        </div>

        {bestOpportunity && (
          <div className="callout">
            {bestOpportunity.success ? (
              <>
                <div className="detail-grid" style={{ marginTop: "0.5rem" }}>
                  <div className="detail-row">
                    <span>Strategy</span>
                    <strong>{bestOpportunity.strategy}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Chain</span>
                    <strong>{formatChainName(bestOpportunity.chainId || 0)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Should Rebalance</span>
                    <strong
                      style={{
                        color: bestOpportunity.shouldRebalance
                          ? "#22c55e"
                          : "#f59e0b",
                      }}
                    >
                      {bestOpportunity.shouldRebalance ? "Yes" : "No"}
                    </strong>
                  </div>
                  {bestOpportunity.apyImprovement !== null &&
                    bestOpportunity.apyImprovement !== undefined && (
                      <div className="detail-row">
                        <span>APY Improvement</span>
                        <strong style={{ color: "#22c55e" }}>
                          +{bestOpportunity.apyImprovement.toFixed(2)}%
                        </strong>
                      </div>
                    )}
                </div>

                {bestOpportunity.currentPosition && (
                  <div style={{ marginTop: "1rem" }}>
                    <strong>Current Position:</strong>
                    <div
                      style={{
                        padding: "0.75rem",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        marginTop: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {bestOpportunity.currentPosition.protocol} -{" "}
                          {bestOpportunity.currentPosition.pool}
                        </span>
                        <strong>
                          {bestOpportunity.currentPosition.apy.toFixed(2)}% APY
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {bestOpportunity.bestOpportunity && (
                  <div style={{ marginTop: "1rem" }}>
                    <strong>Best Opportunity:</strong>
                    <div
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #22c55e",
                        borderRadius: "8px",
                        marginTop: "0.5rem",
                        background: "rgba(34, 197, 94, 0.1)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>
                          {bestOpportunity.bestOpportunity.protocol} -{" "}
                          {bestOpportunity.bestOpportunity.pool}
                        </span>
                        <strong style={{ color: "#22c55e" }}>
                          {bestOpportunity.bestOpportunity.apy.toFixed(2)}% APY
                        </strong>
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          opacity: 0.8,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.25rem",
                        }}
                      >
                        <span>Pool APY: {bestOpportunity.bestOpportunity.poolApy?.toFixed(2) || 0}%</span>
                        <span>Rewards APY: {bestOpportunity.bestOpportunity.rewardsApy?.toFixed(2) || 0}%</span>
                        <span>TVL: {formatUsd(bestOpportunity.bestOpportunity.tvl)}</span>
                        <span>Zyfai TVL: {formatUsd(bestOpportunity.bestOpportunity.zyfiTvl)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {bestOpportunity.allOpportunities &&
                  bestOpportunity.allOpportunities.length > 1 && (
                    <div style={{ marginTop: "1rem" }}>
                      <strong>
                        All Opportunities ({bestOpportunity.allOpportunities.length}):
                      </strong>
                      <div className="list" style={{ marginTop: "0.5rem" }}>
                        {bestOpportunity.allOpportunities.slice(0, 5).map((opp: { protocol: string; pool: string; apy: number; tvl: number }, i: number) => (
                          <div
                            key={i}
                            style={{
                              padding: "0.5rem",
                              display: "flex",
                              justifyContent: "space-between",
                              borderBottom: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <span>
                              {opp.protocol} - {opp.pool}
                            </span>
                            <span>{opp.apy.toFixed(2)}% APY</span>
                          </div>
                        ))}
                        {bestOpportunity.allOpportunities.length > 5 && (
                          <p className="empty" style={{ marginTop: "0.5rem" }}>
                            ...and {bestOpportunity.allOpportunities.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                {bestOpportunity.userConfig && (
                  <div
                    style={{
                      marginTop: "1rem",
                      fontSize: "0.85rem",
                      opacity: 0.7,
                    }}
                  >
                    <strong>User Config:</strong>
                    <div style={{ marginTop: "0.25rem" }}>
                      Auto-select: {bestOpportunity.userConfig.autoSelectProtocols ? "Yes" : "No"}
                    </div>
                    <div>
                      Enabled Protocols: {bestOpportunity.userConfig.enabledProtocols.join(", ") || "None"}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="empty">{bestOpportunity.error || "Failed to get best opportunity"}</p>
            )}
          </div>
        )}
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
    </div>
  );
}

export default App;
