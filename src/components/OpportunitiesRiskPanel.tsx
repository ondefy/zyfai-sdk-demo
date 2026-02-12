import { useState } from "react";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { formatChainName } from "../utils/formatters";
import type { OpportunityRisk, PoolStatus } from "../types";

const riskColor = (v: string) =>
  v === "deep" || v === "healthy" || v === "low"
    ? "text-green-400"
    : v === "moderate" || v === "medium"
    ? "text-yellow-400"
    : "text-red-400";

const trendIcon = (t: string) =>
  t === "rising" ? "↑ Rising" : t === "falling" ? "↓ Falling" : "→ Stable";

const trendColor = (t: string) =>
  t === "rising" ? "text-green-400" : t === "falling" ? "text-red-400" : "text-slate-400";

export function OpportunitiesRiskPanel() {
  const { sdk, isBusy, selectedChain, setStatus, setIsBusy, ensureSdk } = useSdk();

  const [consRisk, setConsRisk] = useState<OpportunityRisk[] | null>(null);
  const [aggRisk, setAggRisk] = useState<OpportunityRisk[] | null>(null);
  const [consStatus, setConsStatus] = useState<PoolStatus[] | null>(null);
  const [aggStatus, setAggStatus] = useState<PoolStatus[] | null>(null);

  const fetchConsRisk = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching conservative risk data…");
      const d = await sdk!.getActiveConservativeOppsRisk(selectedChain);
      setConsRisk(d);
      setStatus(`Loaded ${d.length} conservative opps risk.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchAggRisk = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching aggressive risk data…");
      const d = await sdk!.getActiveAggressiveOppsRisk(selectedChain);
      setAggRisk(d);
      setStatus(`Loaded ${d.length} aggressive opps risk.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchConsStatus = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching conservative pool status…");
      const d = await sdk!.getConservativePoolStatus(selectedChain);
      setConsStatus(d);
      setStatus(`Loaded ${d.length} statuses.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchAggStatus = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching aggressive pool status…");
      const d = await sdk!.getAggressivePoolStatus(selectedChain);
      setAggStatus(d);
      setStatus(`Loaded ${d.length} statuses.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const renderRiskCard = (opp: OpportunityRisk, i: number, prefix: string) => (
    <article key={`${prefix}-${i}`} className="rounded-lg border border-dark-600 bg-dark-900 p-3">
      <div className="flex items-center justify-between">
        <div>
          <strong className="text-sm text-white">{opp.protocolName}</strong>
          <span className="ml-2 text-xs text-slate-400">{opp.poolName}</span>
        </div>
        <span className="text-xs text-slate-300">
          7d: {opp.avgCombinedApy7d != null ? `${opp.avgCombinedApy7d.toFixed(2)}%` : "n/a"}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <DetailRow label="Chain">{formatChainName(opp.chainId)}</DetailRow>
        <DetailRow label="Liquidity">
          <span className={riskColor(opp.liquidityDepth)}>{opp.liquidityDepth}</span>
        </DetailRow>
        <DetailRow label="Utilization">{opp.utilizationRate.toFixed(2)}%</DetailRow>
        <DetailRow label="TVL Stable">
          {opp.tvlStability === null ? "n/a" : opp.tvlStability ? "Yes" : "No"}
        </DetailRow>
        <DetailRow label="APY Stable (30d)">
          {opp.apyStability === null ? "n/a" : opp.apyStability ? "Yes" : "No"}
        </DetailRow>
        {opp.collateralSymbols.length > 0 && (
          <DetailRow label="Collateral">{opp.collateralSymbols.join(", ")}</DetailRow>
        )}
      </div>
    </article>
  );

  const renderStatusCard = (pool: PoolStatus, i: number, prefix: string) => (
    <article key={`${prefix}-${i}`} className="rounded-lg border border-dark-600 bg-dark-900 p-3">
      <div className="flex items-center justify-between">
        <div>
          <strong className="text-sm text-white">{pool.protocolName}</strong>
          <span className="ml-2 text-xs text-slate-400">{pool.poolName}</span>
        </div>
        <span className="text-xs text-slate-300">
          7d: {pool.avgCombinedApy7d != null ? `${pool.avgCombinedApy7d.toFixed(2)}%` : "n/a"}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <DetailRow label="Chain">{formatChainName(pool.chainId)}</DetailRow>
        <DetailRow label="Health">
          <span className={riskColor(pool.healthScore)}>{pool.healthScore}</span>
        </DetailRow>
        <DetailRow label="Risk">
          <span className={riskColor(pool.riskLevel)}>{pool.riskLevel}</span>
        </DetailRow>
        <DetailRow label="APY Trend">
          <span className={trendColor(pool.apyTrend)}>{trendIcon(pool.apyTrend)}</span>
        </DetailRow>
        <DetailRow label="Yield Consistency">{pool.yieldConsistency}</DetailRow>
        <DetailRow label="Liquidity">{pool.liquidityDepth}</DetailRow>
      </div>
    </article>
  );

  return (
    <Panel
      title="Opportunities Risk & Pool Status"
      description="Analyze risk metrics and derived pool health scores."
    >
      <h3 className="mb-2 text-sm font-semibold text-white">Risk Data</h3>
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchConsRisk} disabled={isBusy}>Conservative Risk</Btn>
        <Btn onClick={fetchAggRisk} disabled={isBusy}>Aggressive Risk</Btn>
      </div>

      <h3 className="mt-4 mb-2 text-sm font-semibold text-white">Pool Status</h3>
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchConsStatus} disabled={isBusy}>Conservative Status</Btn>
        <Btn onClick={fetchAggStatus} disabled={isBusy}>Aggressive Status</Btn>
      </div>

      {consRisk && consRisk.length > 0 && (
        <Section title={`Conservative Risk (${consRisk.length})`}>
          {consRisk.slice(0, 8).map((o, i) => renderRiskCard(o, i, "cr"))}
        </Section>
      )}
      {aggRisk && aggRisk.length > 0 && (
        <Section title={`Aggressive Risk (${aggRisk.length})`}>
          {aggRisk.slice(0, 8).map((o, i) => renderRiskCard(o, i, "ar"))}
        </Section>
      )}
      {consStatus && consStatus.length > 0 && (
        <Section title={`Conservative Status (${consStatus.length})`}>
          {consStatus.slice(0, 8).map((p, i) => renderStatusCard(p, i, "cs"))}
        </Section>
      )}
      {aggStatus && aggStatus.length > 0 && (
        <Section title={`Aggressive Status (${aggStatus.length})`}>
          {aggStatus.slice(0, 8).map((p, i) => renderStatusCard(p, i, "as"))}
        </Section>
      )}
    </Panel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">{title}</h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
