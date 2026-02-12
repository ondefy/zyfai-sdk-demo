import { useState } from "react";
import type { TVLResponse, VolumeResponse, APYPerStrategyResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, StatCard } from "./ui";
import { formatUsd, formatChainName } from "../utils/formatters";

export function PlatformStatsPanel() {
  const { sdk, isBusy, setStatus, setIsBusy, ensureSdk } = useSdk();

  const [tvl, setTvl] = useState<TVLResponse | null>(null);
  const [volume, setVolume] = useState<VolumeResponse | null>(null);
  const [apyPerStrategy, setApyPerStrategy] = useState<APYPerStrategyResponse | null>(null);

  const fetchTvl = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching TVL…");
      const res = await sdk!.getTVL();
      setTvl(res);
      setStatus(`TVL: ${formatUsd(res.totalTvl)}`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchVolume = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching volume…");
      const res = await sdk!.getVolume();
      setVolume(res);
      setStatus(`Volume: ${formatUsd(res.volumeInUSD)}`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchApy = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching APY per strategy…");
      const res = await sdk!.getAPYPerStrategy(false, 7, "conservative");
      setApyPerStrategy(res);
      setStatus("APY per strategy loaded.");
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel title="Platform Stats" description="TVL, volume, and APY across all Zyfai accounts.">
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchTvl} disabled={isBusy}>Get TVL</Btn>
        <Btn onClick={fetchVolume} disabled={isBusy}>Get Volume</Btn>
        <Btn onClick={fetchApy} disabled={isBusy}>APY per Strategy</Btn>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tvl && (
          <StatCard label="Total TVL" value={formatUsd(tvl.totalTvl)}>
            {tvl.byChain && Object.keys(tvl.byChain).length > 0 && (
              <div className="mt-2 border-t border-dark-600 pt-2 text-xs text-slate-400">
                {Object.entries(tvl.byChain).map(([chain, val]) => (
                  <div key={chain} className="py-0.5">
                    {formatChainName(chain)}: {formatUsd(val)}
                  </div>
                ))}
              </div>
            )}
          </StatCard>
        )}
        {volume && (
          <StatCard label="Total Volume" value={formatUsd(volume.volumeInUSD)} />
        )}
        {apyPerStrategy && (
          <StatCard label="APY per Strategy (7D)" value="">
            <div className="text-xs text-slate-400">
              {apyPerStrategy.data.map((c) => (
                <div key={c.chain_id} className="py-0.5">
                  {formatChainName(c.chain_id)} – {c.average_apy_without_fee.toFixed(2)}%
                </div>
              ))}
            </div>
          </StatCard>
        )}
      </div>
    </Panel>
  );
}
