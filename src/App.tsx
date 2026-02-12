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
  RegisterAgentResponse,
  CustomizationConfig,
  GetSelectedPoolsResponse,
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

interface OpportunityRisk {
  poolName: string;
  protocolName: string;
  chainId: number;
  liquidityDepth: "deep" | "moderate" | "shallow";
  utilizationRate: number;
  tvlStability: boolean | null;
  apyStability: boolean | null;
  tvlApyCombinedRisk: boolean | null;
  avgCombinedApy7d: number | null;
  avgCombinedApy15d: number | null;
  avgCombinedApy30d: number | null;
  collateralSymbols: string[];
}

interface PoolStatus {
  poolName: string;
  protocolName: string;
  chainId: number;
  healthScore: "healthy" | "moderate" | "risky";
  riskLevel: "low" | "medium" | "high";
  apyTrend: "rising" | "stable" | "falling";
  yieldConsistency: "consistent" | "mixed" | "volatile";
  liquidityDepth: "deep" | "moderate" | "shallow";
  avgCombinedApy7d: number | null;
}

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
  const { address, chain, isConnected } = useAccount();
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

  useEffect(() => {
    if (!address || !isConnected || !chain) return;
     setSelectedChain(chain.id as SupportedChainId);
  }, [address, isConnected, chain]);

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
  const [identityRegistryResult, setIdentityRegistryResult] =
    useState<RegisterAgentResponse | null>(null);

  // Profile configuration state
  const [selectedProtocolIds, setSelectedProtocolIds] = useState<string[]>([]);
  const [autoSelectProtocols, setAutoSelectProtocols] = useState(true);
  const [splittingEnabled, setSplittingEnabled] = useState(false);
  const [minSplitsValue, setMinSplitsValue] = useState(2);
  const [crossChainEnabled, setCrossChainEnabled] = useState(false);
  const [omniAccountEnabled, setOmniAccountEnabled] = useState(false);
  const [autocompoundingEnabled, setAutocompoundingEnabled] = useState(true);
  const [agentNameInput, setAgentNameInput] = useState("");

  // Customization state
  const [selectedCustomProtocol, setSelectedCustomProtocol] = useState<string>("");
  const [availablePools, setAvailablePools] = useState<string[]>([]);
  const [selectedPools, setSelectedPools] = useState<string[]>([]);
  const [customizationAutoselect, setCustomizationAutoselect] = useState(false);
  const [customizationChainId, setCustomizationChainId] = useState<number>(8453);
  const [currentCustomization, setCurrentCustomization] = useState<GetSelectedPoolsResponse | null>(null);
  const [customizationConfigs, setCustomizationConfigs] = useState<CustomizationConfig[]>([]);

  // Opportunities Risk & Pool Status state
  const [conservativeOppsRisk, setConservativeOppsRisk] = useState<
    OpportunityRisk[] | null
  >(null);
  const [aggressiveOppsRisk, setAggressiveOppsRisk] = useState<
    OpportunityRisk[] | null
  >(null);
  const [conservativePoolStatus, setConservativePoolStatus] = useState<
    PoolStatus[] | null
  >(null);
  const [aggressivePoolStatus, setAggressivePoolStatus] = useState<
    PoolStatus[] | null
  >(null);

  // Read-only lookup state (no wallet connection required)
  const [lookupAddress, setLookupAddress] = useState("");

  // Additional input states
  const [earningsStartDate, setEarningsStartDate] = useState("");
  const [earningsEndDate, setEarningsEndDate] = useState("");
  const [apyHistoryDays, setApyHistoryDays] = useState<"7D" | "14D" | "30D">(
    "7D"
  );
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([]);
  const [minSplitsInput, setMinSplitsInput] = useState("1");

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

  // Sync profile configuration state with userDetails
  useEffect(() => {
    if (!userDetails) return;
    
    const user = userDetails.user;
    setSplittingEnabled(user.splitting ?? false);
    setMinSplitsValue(user.minSplits ?? 2);
    setCrossChainEnabled(user.crosschainStrategy ?? false);
    setOmniAccountEnabled(user.omniAccount ?? false);
    setAutocompoundingEnabled(user.autocompounding ?? true);
    setAutoSelectProtocols(user.autoSelectProtocols ?? true);
    
    // Sync agent name if available
    if (user.agentName) {
      setAgentNameInput(user.agentName);
    }
    
    // Sync selected protocol IDs
    if (user.protocols && user.protocols.length > 0) {
      setSelectedProtocolIds(user.protocols.map(p => p.id));
    }
  }, [userDetails]);

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

  const pauseAgent = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Pausing agent (clearing all protocols)…");
      await sdk!.pauseAgent();
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
      setStatus("Agent paused successfully. All protocols cleared.");
    } catch (error) {
      setStatus(`Failed to pause agent: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const enableSplitting = async (minSplits: number) => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus(`Enabling splitting with min splits: ${minSplits}…`);
      await sdk!.enableSplitting(minSplits);
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
      setStatus(`Splitting enabled with min splits: ${minSplits}`);
    } catch (error) {
      setStatus(`Failed to enable splitting: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const disableSplitting = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Disabling splitting…");
      await sdk!.disableSplitting();
      const response = await sdk!.getUserDetails();
      setUserDetails(response);
      setStatus("Splitting disabled successfully.");
    } catch (error) {
      setStatus(`Failed to disable splitting: ${(error as Error).message}`);
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

  const updateProfileWithAdvancedFeatures = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Updating profile with advanced features…");

      const updatePayload: any = {
        autoSelectProtocols,
        splitting: splittingEnabled,
        crosschainStrategy: crossChainEnabled,
        omniAccount: omniAccountEnabled,
        autocompounding: autocompoundingEnabled,
      };

      if (splittingEnabled) {
        updatePayload.minSplits = minSplitsValue;
      }

      if (selectedProtocolIds.length > 0) {
        updatePayload.protocols = selectedProtocolIds;
      }

      if (agentNameInput.trim()) {
        updatePayload.agentName = agentNameInput.trim();
      }

      const response = await sdk!.updateUserProfile(updatePayload);

      setStatus(
        `✓ Profile updated with advanced features!`
      );

      // Refresh user details
      const userDetailsResponse = await sdk!.getUserDetails();
      setUserDetails(userDetailsResponse);

      console.log("Profile update response:", response);
    } catch (error) {
      setStatus(`Failed to update profile: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // Customization Handlers
  // ============================================================================

  const fetchAvailablePools = async () => {
    if (!ensureSdk()) return;
    if (!selectedCustomProtocol) {
      setStatus("Please select a protocol first");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching available pools…");
      const response = await sdk!.getAvailablePools(selectedCustomProtocol);
      setAvailablePools(response.pools);
      setStatus(`Loaded ${response.pools.length} available pools`);
    } catch (error) {
      setStatus(`Failed to get pools: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchSelectedPools = async () => {
    if (!ensureWallet()) return;
    if (!selectedCustomProtocol) {
      setStatus("Please select a protocol first");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching selected pools…");
      const response = await sdk!.getSelectedPools(
        selectedCustomProtocol,
        customizationChainId
      );
      setCurrentCustomization(response);
      setSelectedPools(response.pools);
      setCustomizationAutoselect(response.autoselect);
      setStatus(
        `Current config: ${response.autoselect ? "Autoselect enabled" : `${response.pools.length} pools selected`}`
      );
    } catch (error) {
      setStatus(`No customization found or error: ${(error as Error).message}`);
      setCurrentCustomization(null);
    } finally {
      setIsBusy(false);
    }
  };

  const addToCustomizationBatch = () => {
    if (!selectedCustomProtocol) {
      setStatus("Please select a protocol");
      return;
    }

    const config: CustomizationConfig = {
      protocolId: selectedCustomProtocol,
      pools: customizationAutoselect ? [] : selectedPools,
      chainId: customizationChainId,
      autoselect: customizationAutoselect,
    };

    setCustomizationConfigs([...customizationConfigs, config]);
    setStatus(`Added customization to batch (${customizationConfigs.length + 1} total)`);
  };

  const removeFromCustomizationBatch = (index: number) => {
    const newConfigs = customizationConfigs.filter((_, i) => i !== index);
    setCustomizationConfigs(newConfigs);
    setStatus(`Removed customization from batch (${newConfigs.length} remaining)`);
  };

  const clearCustomizationBatch = () => {
    setCustomizationConfigs([]);
    setStatus("Cleared customization batch");
  };

  const applyCustomizationBatch = async () => {
    if (!ensureWallet()) return;
    if (customizationConfigs.length === 0) {
      setStatus("No customizations in batch");
      return;
    }
    try {
      setIsBusy(true);
      setStatus(`Applying ${customizationConfigs.length} customizations…`);
      await sdk!.customizeBatch(customizationConfigs);
      setStatus(`✓ Successfully applied ${customizationConfigs.length} customizations`);
      setCustomizationConfigs([]);
      // Refresh user details to see updated customization
      const userDetailsResponse = await sdk!.getUserDetails();
      setUserDetails(userDetailsResponse);
    } catch (error) {
      setStatus(`Failed to apply customizations: ${(error as Error).message}`);
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

  // ============================================================================
  // Identity Registry
  // ============================================================================

  const registerAgentOnIdentityRegistry = async () => {
    if (!ensureWallet()) return;
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }

    console.log("selectedChain", selectedChain);
    // Identity Registry only supports Base (8453) and Arbitrum (42161)
    if (selectedChain !== 8453 && selectedChain !== 42161) {
      setStatus(
        "Identity Registry only supports Base (8453) and Arbitrum (42161). Please switch chain."
      );
      return;
    }
    try {
      setIsBusy(true);
      setStatus(
        `Registering agent on Identity Registry (chain ${selectedChain})…`
      );
      const result = await sdk!.registerAgentOnIdentityRegistry(
        walletInfo.address,
        selectedChain
      );
      setIdentityRegistryResult(result);
      setStatus(
        result.success
          ? `Agent registered on Identity Registry. Tx: ${truncate(result.txHash, 10)}`
          : "Identity Registry registration reported a failure."
      );
    } catch (error) {
      setStatus(
        `Failed to register on Identity Registry: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  // ============================================================================
  // Opportunities Risk & Pool Status
  // ============================================================================

  const fetchConservativeOppsRisk = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching conservative opportunities with risk data…");
      const data = await sdk!.getActiveConservativeOppsRisk(selectedChain);
      setConservativeOppsRisk(data);
      setStatus(`Loaded ${data.length} conservative opportunities with risk.`);
    } catch (error) {
      setStatus(
        `Failed to get conservative opps risk: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const fetchAggressiveOppsRisk = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching aggressive opportunities with risk data…");
      const data = await sdk!.getActiveAggressiveOppsRisk(selectedChain);
      setAggressiveOppsRisk(data);
      setStatus(`Loaded ${data.length} aggressive opportunities with risk.`);
    } catch (error) {
      setStatus(
        `Failed to get aggressive opps risk: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const fetchConservativePoolStatus = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching conservative pool status…");
      const data = await sdk!.getConservativePoolStatus(selectedChain);
      setConservativePoolStatus(data);
      setStatus(`Loaded ${data.length} conservative pool statuses.`);
    } catch (error) {
      setStatus(
        `Failed to get conservative pool status: ${(error as Error).message}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const fetchAggressivePoolStatus = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching aggressive pool status…");
      const data = await sdk!.getAggressivePoolStatus(selectedChain);
      setAggressivePoolStatus(data);
      setStatus(`Loaded ${data.length} aggressive pool statuses.`);
    } catch (error) {
      setStatus(
        `Failed to get aggressive pool status: ${(error as Error).message}`
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
    setIdentityRegistryResult(null);
    setConservativeOppsRisk(null);
    setAggressiveOppsRisk(null);
    setConservativePoolStatus(null);
    setAggressivePoolStatus(null);
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
        <div className="control-buttons">
          <button
            onClick={pauseAgent}
            disabled={isBusy || !address}
            title="Pause agent by clearing all protocols"
          >
            Pause Agent
          </button>
        </div>
        </div>

        <h3>Splitting Settings</h3>
        <p>
          Control how deposits are split across multiple protocols for diversification.
        </p>
        <div className="controls">
          <label>
            Minimum Splits
            <input
              type="number"
              min="1"
              value={minSplitsInput}
              onChange={(e) => setMinSplitsInput(e.target.value)}
              placeholder="1"
              disabled={isBusy || !address}
            />
          </label>
        </div>
        <div className="control-buttons">
          <button
            onClick={() => enableSplitting(parseInt(minSplitsInput) || 1)}
            disabled={isBusy || !address}
            title="Enable splitting with specified min splits"
          >
            Enable Splitting
          </button>
          <button
            onClick={disableSplitting}
            disabled={isBusy || !address}
            title="Disable splitting"
          >
            Disable Splitting
          </button>
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
            <div className="detail-row">
              <span>Active Protocols</span>
              <strong>
                {userDetails.user.protocols?.length || 0}
                {userDetails.user.protocols?.length > 0 && (
                  <span style={{ marginLeft: "8px", fontSize: "0.9em", opacity: 0.7 }}>
                    ({userDetails.user.protocols.map(p => p.name).join(", ")})
                  </span>
                )}
              </strong>
            </div>
            <div className="detail-row">
              <span>Splitting Enabled</span>
              <strong>{userDetails.user.splitting ? "Yes" : "No"}</strong>
            </div>
            {userDetails.user.splitting && (
              <div className="detail-row">
                <span>Min Splits</span>
                <strong>{userDetails.user.minSplits || "Not set"}</strong>
              </div>
            )}
          </div>
        ) : (
          <p className="empty">Fetch user details to view profile.</p>
        )}
      </section>

      {/* =========================== ADVANCED PROFILE CONFIGURATION =========================== */}
      <section className="panel">
        <h2>Advanced Profile Configuration</h2>
        <p>
          Configure your user profile with protocols, chains, and advanced
          features like splitting, cross-chain strategies, and more.
        </p>

        {/* Protocols Selection */}
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Protocol Selection
          </h3>
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={autoSelectProtocols}
                onChange={(e) => setAutoSelectProtocols(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Auto-select protocols (recommended)
            </label>
          </div>
          {!autoSelectProtocols && (
            <div style={{ marginTop: "0.5rem" }}>
              <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                Select protocols to use (fetched from getProtocols):
              </p>
              <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #333", padding: "0.5rem", marginTop: "0.5rem" }}>
                {protocols.length > 0 ? (
                  protocols.map((protocol) => (
                    <label
                      key={protocol.id}
                      style={{ display: "block", marginBottom: "0.25rem" }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProtocolIds.includes(protocol.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProtocolIds([...selectedProtocolIds, protocol.id]);
                          } else {
                            setSelectedProtocolIds(
                              selectedProtocolIds.filter((id) => id !== protocol.id)
                            );
                          }
                        }}
                        style={{ marginRight: "0.5rem" }}
                      />
                      {protocol.name} ({protocol.type})
                    </label>
                  ))
                ) : (
                  <p className="empty">
                    Fetch protocols first using the Protocols section
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Features */}
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Advanced Features
          </h3>

          <label style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              type="checkbox"
              checked={splittingEnabled}
              onChange={(e) => setSplittingEnabled(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Enable Position Splitting
          </label>

          {splittingEnabled && (
            <div style={{ marginLeft: "1.5rem", marginBottom: "0.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>
                Min Splits (1-4):
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={minSplitsValue}
                onChange={(e) => setMinSplitsValue(parseInt(e.target.value) || 2)}
                style={{ width: "80px", padding: "0.25rem" }}
              />
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              type="checkbox"
              checked={crossChainEnabled}
              onChange={(e) => setCrossChainEnabled(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Enable Cross-Chain Strategy
          </label>

          <label style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              type="checkbox"
              checked={omniAccountEnabled}
              onChange={(e) => setOmniAccountEnabled(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Enable Omni-Account
          </label>

          <label style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              type="checkbox"
              checked={autocompoundingEnabled}
              onChange={(e) => setAutocompoundingEnabled(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Enable Auto-compounding
          </label>
        </div>

        {/* Agent Name */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="agentName"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Agent Name (optional):
          </label>
          <input
            id="agentName"
            type="text"
            placeholder="My DeFi Agent"
            value={agentNameInput}
            onChange={(e) => setAgentNameInput(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div className="control-buttons">
          <button
            onClick={updateProfileWithAdvancedFeatures}
            disabled={isBusy || !address}
            title={
              !address
                ? "Connect wallet first"
                : "Update profile with all configured features"
            }
          >
            Update Profile with Advanced Features
          </button>
        </div>

        {!address && (
          <p className="empty">
            Connect your wallet to configure advanced profile features.
          </p>
        )}

        {/* Current Configuration Display */}
        {userDetails && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
              Current Configuration
            </h3>
            <div className="callout">
              <div className="detail-grid">
                <div className="detail-row">
                  <span>Auto-select Protocols</span>
                  <strong>
                    {userDetails.user.autoSelectProtocols ? "Yes" : "No"}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Protocols Configured</span>
                  <strong>{userDetails.user.protocols.length}</strong>
                </div>
                <div className="detail-row">
                  <span>Splitting</span>
                  <strong>
                    {userDetails.user.splitting ? `Yes (Min: ${userDetails.user.minSplits || "N/A"})` : "No"}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Cross-Chain</span>
                  <strong>
                    {userDetails.user.crosschainStrategy ? "Yes" : "No"}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Omni-Account</span>
                  <strong>
                    {userDetails.user.omniAccount ? "Yes" : "No"}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Auto-compounding</span>
                  <strong>
                    {userDetails.user.autocompounding !== false ? "Yes" : "No"}
                  </strong>
                </div>
                {userDetails.user.agentName && (
                  <div className="detail-row">
                    <span>Agent Name</span>
                    <strong>{userDetails.user.agentName}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
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

      {/* =========================== PROTOCOL/POOL CUSTOMIZATION =========================== */}
      <section className="panel">
        <h2>Protocol/Pool Customization (Batch)</h2>
        <p>
          Configure specific pools for each protocol on each chain. This provides
          granular control over which pools the rebalance engine uses.
        </p>

        {/* Protocol Selection */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="customProtocol"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Select Protocol:
          </label>
          <select
            id="customProtocol"
            value={selectedCustomProtocol}
            onChange={(e) => {
              setSelectedCustomProtocol(e.target.value);
              setAvailablePools([]);
              setSelectedPools([]);
              setCurrentCustomization(null);
            }}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            <option value="">-- Select a Protocol --</option>
            {protocols.map((protocol) => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.name} ({protocol.type})
              </option>
            ))}
          </select>
        </div>

        {/* Chain Selection */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="customChain"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Chain:
          </label>
          <select
            id="customChain"
            value={customizationChainId}
            onChange={(e) => setCustomizationChainId(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            <option value={8453}>Base (8453)</option>
            <option value={42161}>Arbitrum (42161)</option>
            <option value={9745}>Plasma (9745)</option>
          </select>
        </div>

        {/* Autoselect Toggle */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={customizationAutoselect}
              onChange={(e) => {
                setCustomizationAutoselect(e.target.checked);
                if (e.target.checked) {
                  setSelectedPools([]);
                }
              }}
              style={{ marginRight: "0.5rem" }}
            />
            Autoselect (let engine choose best pools)
          </label>
        </div>

        <div className="control-buttons" style={{ marginBottom: "1rem" }}>
          <button
            onClick={fetchAvailablePools}
            disabled={isBusy || !selectedCustomProtocol}
            title={
              !selectedCustomProtocol
                ? "Select a protocol first"
                : "Get available pools for this protocol"
            }
          >
            Get Available Pools
          </button>
          <button
            onClick={fetchSelectedPools}
            disabled={isBusy || !address || !selectedCustomProtocol}
            title={
              !address
                ? "Connect wallet first"
                : !selectedCustomProtocol
                ? "Select a protocol first"
                : "Get current pool configuration"
            }
          >
            Get Current Config
          </button>
        </div>

        {/* Available Pools Selection */}
        {!customizationAutoselect && availablePools.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
              Available Pools (select to use):
            </h3>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                border: "1px solid #333",
                padding: "0.5rem",
              }}
            >
              {availablePools.map((pool) => (
                <label
                  key={pool}
                  style={{ display: "block", marginBottom: "0.25rem" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPools.includes(pool)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPools([...selectedPools, pool]);
                      } else {
                        setSelectedPools(selectedPools.filter((p) => p !== pool));
                      }
                    }}
                    style={{ marginRight: "0.5rem" }}
                  />
                  {pool}
                </label>
              ))}
            </div>
            <p style={{ fontSize: "0.9rem", marginTop: "0.5rem", opacity: 0.7 }}>
              Selected: {selectedPools.length} / {availablePools.length} pools
            </p>
          </div>
        )}

        {/* Add to Batch Button */}
        <div className="control-buttons" style={{ marginBottom: "1rem" }}>
          <button
            onClick={addToCustomizationBatch}
            disabled={isBusy || !selectedCustomProtocol}
            title="Add current configuration to batch"
          >
            Add to Batch
          </button>
        </div>

        {/* Current Customization Display */}
        {currentCustomization && (
          <div className="callout" style={{ marginTop: "1rem" }}>
            <div>
              <strong>Current Configuration</strong>
            </div>
            <div className="detail-grid" style={{ marginTop: "0.5rem" }}>
              <div className="detail-row">
                <span>Autoselect</span>
                <strong>
                  {currentCustomization.autoselect ? "Yes" : "No"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Pools</span>
                <strong>
                  {currentCustomization.autoselect
                    ? "Engine chooses"
                    : currentCustomization.pools.length > 0
                    ? `${currentCustomization.pools.length} pools`
                    : "None"}
                </strong>
              </div>
            </div>
            {!currentCustomization.autoselect &&
              currentCustomization.pools.length > 0 && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                  <strong>Pools:</strong>
                  <div style={{ marginTop: "0.25rem" }}>
                    {currentCustomization.pools.join(", ")}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Batch Queue */}
        {customizationConfigs.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
              Customization Batch ({customizationConfigs.length})
            </h3>
            <div
              style={{
                border: "1px solid #333",
                padding: "0.5rem",
                maxHeight: "250px",
                overflowY: "auto",
              }}
            >
              {customizationConfigs.map((config, index) => {
                const protocol = protocols.find((p) => p.id === config.protocolId);
                const chainName =
                  config.chainId === 8453
                    ? "Base"
                    : config.chainId === 42161
                    ? "Arbitrum"
                    : config.chainId === 9745
                    ? "Plasma"
                    : `Chain ${config.chainId}`;
                return (
                  <div
                    key={index}
                    style={{
                      padding: "0.5rem",
                      marginBottom: "0.5rem",
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>
                        {protocol?.name || config.protocolId} - {chainName}
                      </div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                        {config.autoselect
                          ? "Autoselect enabled"
                          : `${config.pools.length} pool(s)`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCustomizationBatch(index)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.8rem",
                        backgroundColor: "#ff4444",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="control-buttons" style={{ marginTop: "0.5rem" }}>
              <button
                onClick={applyCustomizationBatch}
                disabled={isBusy || !address}
                title={
                  !address
                    ? "Connect wallet first"
                    : "Apply all customizations"
                }
                style={{ backgroundColor: "#22c55e" }}
              >
                Apply Batch ({customizationConfigs.length})
              </button>
              <button
                onClick={clearCustomizationBatch}
                disabled={isBusy}
                style={{ backgroundColor: "#ff4444" }}
              >
                Clear Batch
              </button>
            </div>
          </div>
        )}

        {!address && (
          <p className="empty">
            Connect your wallet to configure protocol/pool customizations.
          </p>
        )}

        {protocols.length === 0 && (
          <p className="empty">
            Fetch protocols first using the Protocols section above.
          </p>
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

      {/* =============================== OPPORTUNITIES RISK & POOL STATUS =============================== */}
      <section className="panel">
        <h2>Opportunities Risk & Pool Status</h2>
        <p>
          Analyze live yield opportunities with risk metrics (liquidity depth,
          utilization, stability) and derived pool health scores.
        </p>

        <h3>Opportunities with Risk Data</h3>
        <div className="control-buttons">
          <button onClick={fetchConservativeOppsRisk} disabled={isBusy}>
            Conservative Opps Risk
          </button>
          <button onClick={fetchAggressiveOppsRisk} disabled={isBusy}>
            Aggressive Opps Risk
          </button>
        </div>

        <h3 style={{ marginTop: "1.5rem" }}>Pool Status (Derived Health)</h3>
        <div className="control-buttons">
          <button onClick={fetchConservativePoolStatus} disabled={isBusy}>
            Conservative Pool Status
          </button>
          <button onClick={fetchAggressivePoolStatus} disabled={isBusy}>
            Aggressive Pool Status
          </button>
        </div>

        {/* ---------- Conservative Opps Risk ---------- */}
        {conservativeOppsRisk && conservativeOppsRisk.length > 0 && (
          <div className="list" style={{ marginTop: "1.5rem" }}>
            <strong>
              Conservative Opportunities Risk ({conservativeOppsRisk.length})
            </strong>
            {conservativeOppsRisk.slice(0, 8).map((opp, i) => (
              <article key={`cons-risk-${i}`}>
                <header>
                  <div>
                    <strong>{opp.protocolName}</strong>
                    <span> | {opp.poolName}</span>
                  </div>
                  <small>
                    7d APY:{" "}
                    {opp.avgCombinedApy7d != null
                      ? `${opp.avgCombinedApy7d.toFixed(2)}%`
                      : "n/a"}
                  </small>
                </header>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span>Chain</span>
                    <strong>{formatChainName(opp.chainId)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Liquidity Depth</span>
                    <strong
                      style={{
                        color:
                          opp.liquidityDepth === "deep"
                            ? "#22c55e"
                            : opp.liquidityDepth === "moderate"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {opp.liquidityDepth}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Utilization</span>
                    <strong>{opp.utilizationRate.toFixed(2)}%</strong>
                  </div>
                  <div className="detail-row">
                    <span>TVL Stable</span>
                    <strong>
                      {opp.tvlStability === null
                        ? "n/a"
                        : opp.tvlStability
                        ? "Yes"
                        : "No"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>APY Stable (30d)</span>
                    <strong>
                      {opp.apyStability === null
                        ? "n/a"
                        : opp.apyStability
                        ? "Yes"
                        : "No"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>15d APY</span>
                    <strong>
                      {opp.avgCombinedApy15d != null
                        ? `${opp.avgCombinedApy15d.toFixed(2)}%`
                        : "n/a"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>30d APY</span>
                    <strong>
                      {opp.avgCombinedApy30d != null
                        ? `${opp.avgCombinedApy30d.toFixed(2)}%`
                        : "n/a"}
                    </strong>
                  </div>
                  {opp.collateralSymbols.length > 0 && (
                    <div className="detail-row">
                      <span>Collateral</span>
                      <strong>{opp.collateralSymbols.join(", ")}</strong>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ---------- Aggressive Opps Risk ---------- */}
        {aggressiveOppsRisk && aggressiveOppsRisk.length > 0 && (
          <div className="list" style={{ marginTop: "1.5rem" }}>
            <strong>
              Aggressive Opportunities Risk ({aggressiveOppsRisk.length})
            </strong>
            {aggressiveOppsRisk.slice(0, 8).map((opp, i) => (
              <article key={`agg-risk-${i}`}>
                <header>
                  <div>
                    <strong>{opp.protocolName}</strong>
                    <span> | {opp.poolName}</span>
                  </div>
                  <small>
                    7d APY:{" "}
                    {opp.avgCombinedApy7d != null
                      ? `${opp.avgCombinedApy7d.toFixed(2)}%`
                      : "n/a"}
                  </small>
                </header>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span>Chain</span>
                    <strong>{formatChainName(opp.chainId)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Liquidity Depth</span>
                    <strong
                      style={{
                        color:
                          opp.liquidityDepth === "deep"
                            ? "#22c55e"
                            : opp.liquidityDepth === "moderate"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {opp.liquidityDepth}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Utilization</span>
                    <strong>{opp.utilizationRate.toFixed(2)}%</strong>
                  </div>
                  <div className="detail-row">
                    <span>TVL Stable</span>
                    <strong>
                      {opp.tvlStability === null
                        ? "n/a"
                        : opp.tvlStability
                        ? "Yes"
                        : "No"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>APY Stable (30d)</span>
                    <strong>
                      {opp.apyStability === null
                        ? "n/a"
                        : opp.apyStability
                        ? "Yes"
                        : "No"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>15d APY</span>
                    <strong>
                      {opp.avgCombinedApy15d != null
                        ? `${opp.avgCombinedApy15d.toFixed(2)}%`
                        : "n/a"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>30d APY</span>
                    <strong>
                      {opp.avgCombinedApy30d != null
                        ? `${opp.avgCombinedApy30d.toFixed(2)}%`
                        : "n/a"}
                    </strong>
                  </div>
                  {opp.collateralSymbols.length > 0 && (
                    <div className="detail-row">
                      <span>Collateral</span>
                      <strong>{opp.collateralSymbols.join(", ")}</strong>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ---------- Conservative Pool Status ---------- */}
        {conservativePoolStatus && conservativePoolStatus.length > 0 && (
          <div className="list" style={{ marginTop: "1.5rem" }}>
            <strong>
              Conservative Pool Status ({conservativePoolStatus.length})
            </strong>
            {conservativePoolStatus.slice(0, 8).map((pool, i) => (
              <article key={`cons-status-${i}`}>
                <header>
                  <div>
                    <strong>{pool.protocolName}</strong>
                    <span> | {pool.poolName}</span>
                  </div>
                  <small>
                    7d APY:{" "}
                    {pool.avgCombinedApy7d != null
                      ? `${pool.avgCombinedApy7d.toFixed(2)}%`
                      : "n/a"}
                  </small>
                </header>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span>Chain</span>
                    <strong>{formatChainName(pool.chainId)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Health</span>
                    <strong
                      style={{
                        color:
                          pool.healthScore === "healthy"
                            ? "#22c55e"
                            : pool.healthScore === "moderate"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {pool.healthScore}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Risk Level</span>
                    <strong
                      style={{
                        color:
                          pool.riskLevel === "low"
                            ? "#22c55e"
                            : pool.riskLevel === "medium"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {pool.riskLevel}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>APY Trend</span>
                    <strong
                      style={{
                        color:
                          pool.apyTrend === "rising"
                            ? "#22c55e"
                            : pool.apyTrend === "falling"
                            ? "#ef4444"
                            : "#94a3b8",
                      }}
                    >
                      {pool.apyTrend === "rising"
                        ? "↑ Rising"
                        : pool.apyTrend === "falling"
                        ? "↓ Falling"
                        : "→ Stable"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Yield Consistency</span>
                    <strong>{pool.yieldConsistency}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Liquidity</span>
                    <strong>{pool.liquidityDepth}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ---------- Aggressive Pool Status ---------- */}
        {aggressivePoolStatus && aggressivePoolStatus.length > 0 && (
          <div className="list" style={{ marginTop: "1.5rem" }}>
            <strong>
              Aggressive Pool Status ({aggressivePoolStatus.length})
            </strong>
            {aggressivePoolStatus.slice(0, 8).map((pool, i) => (
              <article key={`agg-status-${i}`}>
                <header>
                  <div>
                    <strong>{pool.protocolName}</strong>
                    <span> | {pool.poolName}</span>
                  </div>
                  <small>
                    7d APY:{" "}
                    {pool.avgCombinedApy7d != null
                      ? `${pool.avgCombinedApy7d.toFixed(2)}%`
                      : "n/a"}
                  </small>
                </header>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span>Chain</span>
                    <strong>{formatChainName(pool.chainId)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Health</span>
                    <strong
                      style={{
                        color:
                          pool.healthScore === "healthy"
                            ? "#22c55e"
                            : pool.healthScore === "moderate"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {pool.healthScore}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Risk Level</span>
                    <strong
                      style={{
                        color:
                          pool.riskLevel === "low"
                            ? "#22c55e"
                            : pool.riskLevel === "medium"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {pool.riskLevel}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>APY Trend</span>
                    <strong
                      style={{
                        color:
                          pool.apyTrend === "rising"
                            ? "#22c55e"
                            : pool.apyTrend === "falling"
                            ? "#ef4444"
                            : "#94a3b8",
                      }}
                    >
                      {pool.apyTrend === "rising"
                        ? "↑ Rising"
                        : pool.apyTrend === "falling"
                        ? "↓ Falling"
                        : "→ Stable"}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Yield Consistency</span>
                    <strong>{pool.yieldConsistency}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Liquidity</span>
                    <strong>{pool.liquidityDepth}</strong>
                  </div>
                </div>
              </article>
            ))}
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

      {/* =============================== IDENTITY REGISTRY =============================== */}
      <section className="panel">
        <h2>Identity Registry</h2>
        <p>
          Register your agent on the on-chain Identity Registry. This calls the
          smart contract to mint an identity token for your smart wallet.
          <br />
          <strong>Supported chains:</strong> Base (8453) and Arbitrum (42161)
          only.
        </p>
        <div className="control-buttons">
          <button
            onClick={registerAgentOnIdentityRegistry}
            disabled={
              isBusy ||
              !address ||
              !walletInfo?.address ||
              (selectedChain !== 8453 && selectedChain !== 42161)
            }
            title={
              !walletInfo?.address
                ? "Resolve Smart Wallet first"
                : selectedChain !== 8453 && selectedChain !== 42161
                ? "Switch to Base or Arbitrum"
                : "Register agent on Identity Registry"
            }
          >
            Register Agent on Identity Registry
          </button>
        </div>

        {!walletInfo?.address && (
          <p className="empty">
            Resolve your Smart Wallet first, then register on the Identity
            Registry.
          </p>
        )}

        {walletInfo?.address &&
          selectedChain !== 8453 &&
          selectedChain !== 42161 && (
            <p className="empty">
              Please switch to Base (8453) or Arbitrum (42161) to use the
              Identity Registry.
            </p>
          )}

        {identityRegistryResult && (
          <div className="callout">
            <div>
              <strong>Identity Registry Registration</strong>
            </div>
            <div className="detail-grid" style={{ marginTop: "0.5rem" }}>
              <div className="detail-row">
                <span>Status</span>
                <strong
                  style={{
                    color: identityRegistryResult.success
                      ? "#22c55e"
                      : "#ef4444",
                  }}
                >
                  {identityRegistryResult.success ? "Success" : "Failed"}
                </strong>
              </div>
              <div className="detail-row">
                <span>Transaction</span>
                <a
                  href={getExplorerUrl(
                    identityRegistryResult.chainId,
                    identityRegistryResult.txHash
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  {truncate(identityRegistryResult.txHash, 10)}
                </a>
              </div>
              <div className="detail-row">
                <span>Chain</span>
                <strong>
                  {formatChainName(identityRegistryResult.chainId)}
                </strong>
              </div>
              <div className="detail-row">
                <span>Smart Wallet</span>
                <code>
                  {truncate(identityRegistryResult.smartWallet, 10)}
                </code>
              </div>
            </div>
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
