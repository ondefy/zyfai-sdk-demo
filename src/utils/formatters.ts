import type { SupportedChainId } from "@zyfai/sdk";

// ---------------------------------------------------------------------------
// Chain helpers
// ---------------------------------------------------------------------------

export const CHAIN_OPTIONS: { id: SupportedChainId; label: string }[] = [
  { id: 8453, label: "Base (8453)" },
  { id: 42161, label: "Arbitrum (42161)" },
  { id: 9745, label: "Plasma (9745)" },
];

export const isSupportedChain = (value: number): value is SupportedChainId =>
  CHAIN_OPTIONS.some((chain) => chain.id === value);

export const formatChainName = (chainId: string | number) => {
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

export const filterSupportedChains = (chains: (string | number)[]) =>
  chains.filter((chain) => {
    const id = String(chain);
    return id === "8453" || id === "42161" || id === "9745";
  });

export const getExplorerUrl = (chainId: string | number, txHash: string) => {
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

// ---------------------------------------------------------------------------
// Value formatters
// ---------------------------------------------------------------------------

export const truncate = (value?: string, visible = 8) => {
  if (!value) return "";
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}…${value.slice(-4)}`;
};

export const formatUsd = (value?: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === undefined || num === null || isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
};
