import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { arbitrum, base, mainnet } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { cookieStorage, createStorage, http } from "wagmi";

const supportedNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  base,
  arbitrum,
];

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY;

if (!projectId) {
  throw new Error(
    "VITE_WALLETCONNECT_PROJECT_ID is required to use the Reown AppKit demo"
  );
}

const metadataUrl =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://localhost";

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: supportedNetworks,
  ssr: false,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [mainnet.id]: http(
      alchemyApiKey
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        : undefined
    ),
    [base.id]: http(
      alchemyApiKey
        ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        : undefined
    ),
    [arbitrum.id]: http(
      alchemyApiKey
        ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        : undefined
    ),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Initialize AppKit at module level to ensure it's ready before any component mounts
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: supportedNetworks,
  metadata: {
    name: "Zyfai SDK + Reown Demo",
    description: "Minimal front-end that implements the Zyfai SDK methods",
    url: metadataUrl,
    icons: [`${metadataUrl}/vite.svg`],
  },
  features: {
    socials: false,
    email: false,
    analytics: false,
    onramp: false,
    swaps: false,
    history: false,
    allWallets: false,
  },
  themeMode: "dark",
  allowUnsupportedChain: true,
  enableWalletConnect: true,
  enableInjected: true,
  enableCoinbase: false,
  enableEIP6963: true,
});
