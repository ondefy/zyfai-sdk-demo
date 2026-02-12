import { useState } from "react";
import type { OpportunitiesResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel } from "./ui";
import { formatChainName } from "../utils/formatters";

export function YieldOpportunitiesPanel() {
  const { sdk, isBusy, selectedChain, setStatus, setIsBusy, ensureSdk } = useSdk();

  const [conservative, setConservative] = useState<OpportunitiesResponse | null>(null);
  const [aggressive, setAggressive] = useState<OpportunitiesResponse | null>(null);

  const fetchConservative = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching conservative opportunities…");
      const res = await sdk!.getConservativeOpportunities(selectedChain);
      setConservative(res);
      setStatus(`Loaded ${res.data.length} conservative opportunities.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchAggressive = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching aggressive opportunities…");
      const res = await sdk!.getAggressiveOpportunities(selectedChain);
      setAggressive(res);
      setStatus(`Loaded ${res.data.length} aggressive opportunities.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderOpp = (opp: any) => {
    const proto = opp.protocolName || opp.protocol_name || "Protocol";
    const pool = opp.poolName || opp.pool_name || "Pool";
    const apy = opp.apy || opp.pool_apy || opp.combined_apy || 0;
    const chain = opp.chainId || opp.chain_id;
    return (
      <div
        key={opp.id}
        className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm"
      >
        <div>
          <strong className="text-white">{proto}</strong>
          <span className="ml-2 text-slate-400">{pool}</span>
          <span className="ml-2 text-xs text-slate-500">
            {formatChainName(chain)}
          </span>
        </div>
        <span className="font-semibold text-primary">
          {Number(apy).toFixed(2)}%
        </span>
      </div>
    );
  };

  return (
    <Panel
      title="Yield Opportunities"
      description="Explore conservative and aggressive yield opportunities."
    >
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchConservative} disabled={isBusy}>
          Conservative
        </Btn>
        <Btn onClick={fetchAggressive} disabled={isBusy}>
          Aggressive
        </Btn>
      </div>

      {conservative && conservative.data.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
            Conservative ({conservative.data.length})
          </h3>
          <div className="flex flex-col gap-2">
            {conservative.data.slice(0, 5).map(renderOpp)}
          </div>
        </div>
      )}

      {aggressive && aggressive.data.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
            Aggressive ({aggressive.data.length})
          </h3>
          <div className="flex flex-col gap-2">
            {aggressive.data.slice(0, 5).map(renderOpp)}
          </div>
        </div>
      )}
    </Panel>
  );
}
