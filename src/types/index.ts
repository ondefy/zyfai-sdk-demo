import type { Position } from "@zyfai/sdk";

export type PositionBundle = Position & {
  positions?: Position["positions"];
  chain?: string;
};

export interface OpportunityRisk {
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

export interface PoolStatus {
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
