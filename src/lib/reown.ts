import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { arbitrum, base, plasma } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { cookieStorage, createStorage } from "wagmi";

const supportedNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  base,
  arbitrum,
  plasma,
];

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

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
  },
  themeMode: "dark",
  allowUnsupportedChain: true,
});
