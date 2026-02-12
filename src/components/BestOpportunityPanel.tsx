import { useState } from "react";
import type { BestOpportunityResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { formatUsd, formatChainName } from "../utils/formatters";

export function BestOpportunityPanel() {
  const { sdk, isBusy, selectedChain, setStatus, setIsBusy, walletInfo, ensureSdk } =
    useSdk();

  const [data, setData] = useState<BestOpportunityResponse | null>(null);

  const fetch = async () => {
    if (!ensureSdk() || !walletInfo?.address) {
      setStatus("Resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching best opportunity…");
      const res = await sdk!.getBestOpportunity(
        walletInfo.address as `0x${string}`,
        selectedChain
      );
      setData(res);
      if (res.success && res.bestOpportunity) {
        setStatus(
          `Best: ${res.bestOpportunity.protocol} – ${res.bestOpportunity.pool} (${res.bestOpportunity.apy.toFixed(2)}%)`
        );
      } else {
        setStatus(res.error || "No opportunities found.");
      }
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel title="Best Opportunity" description="Best yield opportunity for your smart wallet.">
      <Btn onClick={fetch} disabled={isBusy || !walletInfo?.address}>
        Get Best Opportunity
      </Btn>

      {data && (
        <div className="mt-4">
          {data.success ? (
            <>
              <div className="flex flex-col gap-2">
                <DetailRow label="Strategy">{data.strategy}</DetailRow>
                <DetailRow label="Chain">{formatChainName(data.chainId || 0)}</DetailRow>
                <DetailRow label="Should Rebalance">
                  <span className={data.shouldRebalance ? "text-green-400" : "text-yellow-400"}>
                    {data.shouldRebalance ? "Yes" : "No"}
                  </span>
                </DetailRow>
                {data.apyImprovement != null && (
                  <DetailRow label="APY Improvement">
                    <span className="text-green-400">+{data.apyImprovement.toFixed(2)}%</span>
                  </DetailRow>
                )}
              </div>

              {data.currentPosition && (
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase text-slate-400">Current</span>
                  <div className="mt-1 flex justify-between rounded-lg border border-dark-600 bg-dark-900 p-3 text-sm">
                    <span>
                      {data.currentPosition.protocol} – {data.currentPosition.pool}
                    </span>
                    <strong>{data.currentPosition.apy.toFixed(2)}% APY</strong>
                  </div>
                </div>
              )}

              {data.bestOpportunity && (
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase text-slate-400">Best</span>
                  <div className="mt-1 rounded-lg border border-green-600 bg-green-600/10 p-3">
                    <div className="flex justify-between text-sm">
                      <span>
                        {data.bestOpportunity.protocol} – {data.bestOpportunity.pool}
                      </span>
                      <strong className="text-green-400">
                        {data.bestOpportunity.apy.toFixed(2)}% APY
                      </strong>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
                      <span>Pool APY: {data.bestOpportunity.poolApy?.toFixed(2) || 0}%</span>
                      <span>Rewards: {data.bestOpportunity.rewardsApy?.toFixed(2) || 0}%</span>
                      <span>TVL: {formatUsd(data.bestOpportunity.tvl)}</span>
                      <span>Zyfai TVL: {formatUsd(data.bestOpportunity.zyfiTvl)}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.allOpportunities && data.allOpportunities.length > 1 && (
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    All ({data.allOpportunities.length})
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {data.allOpportunities
                      .slice(0, 5)
                      .map(
                        (
                          o: { protocol: string; pool: string; apy: number },
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="flex justify-between border-b border-dark-600 px-1 py-1 text-sm"
                          >
                            <span>
                              {o.protocol} – {o.pool}
                            </span>
                            <span>{o.apy.toFixed(2)}%</span>
                          </div>
                        )
                      )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm italic text-slate-500">
              {data.error || "Failed to get best opportunity."}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
