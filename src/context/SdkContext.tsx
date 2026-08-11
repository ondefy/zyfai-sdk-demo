/* eslint-disable react-hooks/set-state-in-effect */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { ZyfaiSDK } from "@zyfai/sdk";
import type {
  Protocol,
  SmartWalletResponse,
  SupportedChainId,
  UpdateUserProfileResponse,
} from "@zyfai/sdk";
import { isSupportedChain } from "../utils/formatters";

export type ProfileAsset = "USDC" | "WETH";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface SdkContextValue {
  // SDK instance
  sdk: ZyfaiSDK | null;

  // Wagmi / wallet
  address: `0x${string}` | undefined;
  isConnected: boolean;

  // UI state
  status: string;
  setStatus: (s: string) => void;
  isBusy: boolean;
  setIsBusy: (b: boolean) => void;
  selectedChain: SupportedChainId;
  setSelectedChain: (c: SupportedChainId) => void;

  // Shared data (used by multiple panels)
  walletInfo: SmartWalletResponse | null;
  setWalletInfo: (w: SmartWalletResponse | null) => void;
  userDetails: UpdateUserProfileResponse | null;
  setUserDetails: (u: UpdateUserProfileResponse | null) => void;
  protocols: Protocol[];
  setProtocols: (p: Protocol[]) => void;

  /** Which asset profile getUserDetails / updateUserProfile target (USDC vs WETH). */
  profileAsset: ProfileAsset;
  selectProfileAsset: (asset: ProfileAsset) => Promise<void>;

  // Helpers
  ensureSdk: () => boolean;
  ensureWallet: () => boolean;
  refreshUserDetails: () => Promise<void>;

  // Wallet actions
  disconnectWallet: () => void;
  openModal: () => void;
}

const SdkContext = createContext<SdkContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_CHAIN: SupportedChainId = 8453;

export function SdkProvider({ children }: PropsWithChildren) {
  const { address, chain, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  // UI
  const [status, setStatus] = useState("Connect a wallet to begin");
  const [isBusy, setIsBusy] = useState(false);
  const [selectedChain, setSelectedChain] =
    useState<SupportedChainId>(DEFAULT_CHAIN);

  // Shared data
  const [walletInfo, setWalletInfo] = useState<SmartWalletResponse | null>(
    null
  );
  const [userDetails, setUserDetails] = useState<UpdateUserProfileResponse | null>(
    null
  );
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [profileAsset, setProfileAsset] = useState<ProfileAsset>("USDC");

  // SDK instance (stable across renders)
  const sdk = useMemo(() => {
    const apiKey = import.meta.env.VITE_ZYFAI_API_KEY;
    if (!apiKey) {
      console.warn("Set VITE_ZYFAI_API_KEY to use the SDK.");
      return null;
    }
    return new ZyfaiSDK({ apiKey, referralSource: "openclaw" });
  }, []);

  // Sync chain when wallet changes network
  useEffect(() => {
    if (!address || !isConnected || !chain) return;
    if (isSupportedChain(chain.id)) {
      setSelectedChain(chain.id);
    }
  }, [address, isConnected, chain]);

  // Connect wallet to SDK whenever walletClient changes, then resolve Safe
  useEffect(() => {
    if (!sdk || !walletClient || !address) return;
    let active = true;
    setStatus("Linking wallet to Zyfai SDK…");
    const chainId: SupportedChainId = isSupportedChain(
      walletClient.chain?.id ?? 0
    )
      ? walletClient.chain!.id
      : DEFAULT_CHAIN;

    sdk
      .connectAccount(walletClient, chainId)
      .then(async () => {
        if (!active) return;
        setStatus("Wallet ready. You can now use Zyfai.");
        try {
          const res = await sdk.getSmartWalletAddress(address, chainId);
          if (active && res.address) {
            setWalletInfo(res);
          }
        } catch {
          // No Safe assigned yet (expected before first deposit)
        }
      })
      .catch((err) => {
        if (active)
          setStatus(`Failed to connect wallet: ${(err as Error).message}`);
      });
    return () => {
      active = false;
    };
  }, [sdk, walletClient, address]);

  // User details often already include smartWallet — keep walletInfo in sync
  useEffect(() => {
    if (!userDetails?.smartWallet) return;
    setWalletInfo((prev) => {
      if (prev?.address === userDetails.smartWallet) return prev;
      return {
        address: userDetails.smartWallet!,
        isDeployed: prev?.isDeployed ?? true,
        isOwner: prev?.isOwner ?? true,
      };
    });
  }, [userDetails?.smartWallet]);

  // Helpers
  const ensureSdk = () => {
    if (!sdk) {
      setStatus("Missing env vars. Set VITE_ZYFAI_API_KEY.");
      return false;
    }
    return true;
  };

  const ensureWallet = () => {
    if (!ensureSdk()) return false;
    if (!address) {
      setStatus("Please connect a wallet first.");
      return false;
    }
    return true;
  };

  const selectProfileAsset = useCallback(
    async (asset: ProfileAsset) => {
      setProfileAsset(asset);
      if (!sdk) return;
      try {
        const res = await sdk.getUserDetails(asset);
        setUserDetails(res);
      } catch {
        // silent
      }
    },
    [sdk]
  );

  const refreshUserDetails = useCallback(async () => {
    if (!sdk) return;
    try {
      const res = await sdk.getUserDetails(profileAsset);
      setUserDetails(res);
    } catch {
      // silent
    }
  }, [sdk, profileAsset]);

  const disconnectWallet = () => {
    disconnect();
    setWalletInfo(null);
    setUserDetails(null);
    setProtocols([]);
    setProfileAsset("USDC");
    setStatus("Wallet disconnected.");
  };

  const openModal = () => open?.();

  const value: SdkContextValue = {
    sdk,
    address,
    isConnected,
    status,
    setStatus,
    isBusy,
    setIsBusy,
    selectedChain,
    setSelectedChain,
    walletInfo,
    setWalletInfo,
    userDetails,
    setUserDetails,
    protocols,
    setProtocols,
    profileAsset,
    selectProfileAsset,
    ensureSdk,
    ensureWallet,
    refreshUserDetails,
    disconnectWallet,
    openModal,
  };

  return <SdkContext.Provider value={value}>{children}</SdkContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function useSdk() {
  const ctx = useContext(SdkContext);
  if (!ctx) throw new Error("useSdk must be used within <SdkProvider>");
  return ctx;
}
