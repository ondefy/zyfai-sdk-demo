import { useState } from "react";
import type { SdkKeyTVLResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow, Callout } from "./ui";
import { formatUsd, truncate, formatChainName } from "../utils/formatters";

interface AllowedWallets {
  success: boolean;
  allowedWallets: string[];
  metadata: { sdkKeyId: string; clientName: string; walletsCount: number };
}

export function SdkKeyInfoPanel() {
  const { sdk, isBusy, setStatus, setIsBusy, ensureSdk } = useSdk();

  const [wallets, setWallets] = useState<AllowedWallets | null>(null);
  const [tvl, setTvl] = useState<SdkKeyTVLResponse | null>(null);

  const fetchWallets = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching SDK allowed wallets…");
      const res = await sdk!.getSdkAllowedWallets();
      setWallets(res);
      setStatus(`${res.metadata.walletsCount} wallet(s) for ${res.metadata.clientName}`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchTvl = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching SDK key TVL…");
      const res = await sdk!.getSdkKeyTVL();
      setTvl(res);
      setStatus(`SDK TVL: ${formatUsd(res.totalTvl)}`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel title="SDK Key Information" description="Allowed wallets and TVL for your API key.">
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchWallets} disabled={isBusy}>Get Allowed Wallets</Btn>
        <Btn onClick={fetchTvl} disabled={isBusy}>Get SDK Key TVL</Btn>
      </div>

      {wallets && (
        <Callout>
          <strong>{wallets.metadata.clientName}</strong>
          <div className="mt-2 flex flex-col gap-2">
            <DetailRow label="SDK Key ID">
              <code className="rounded bg-dark-800 px-1 py-0.5 font-mono text-xs">
                {truncate(wallets.metadata.sdkKeyId, 12)}
              </code>
            </DetailRow>
            <DetailRow label="Total Wallets">{wallets.metadata.walletsCount}</DetailRow>
          </div>
          {wallets.allowedWallets.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-400">Allowed Wallets:</span>
              {wallets.allowedWallets.slice(0, 10).map((w, i) => (
                <div key={i} className="mt-1">
                  <code className="text-xs text-slate-300">{truncate(w, 12)}</code>
                </div>
              ))}
              {wallets.allowedWallets.length > 10 && (
                <p className="mt-1 text-xs italic text-slate-500">
                  …and {wallets.allowedWallets.length - 10} more
                </p>
              )}
            </div>
          )}
        </Callout>
      )}

      {tvl && (
        <Callout>
          <strong>{tvl.metadata?.clientName || "Unknown"}</strong>
          <div className="mt-2 flex flex-col gap-2">
            <DetailRow label="Total Wallets">{tvl.metadata?.walletsCount || 0}</DetailRow>
            <DetailRow label="Total TVL">{formatUsd(tvl.totalTvl)}</DetailRow>
          </div>
          {tvl.tvlByWallet && tvl.tvlByWallet.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-400">Top 5 Wallets:</span>
              {tvl.tvlByWallet
                .sort((a, b) => b.tvl - a.tvl)
                .slice(0, 5)
                .map((w, i) => (
                  <div key={i} className="mt-2 rounded-lg border border-dark-600 bg-dark-900 p-2">
                    <div className="flex justify-between text-sm">
                      <code className="text-xs">{truncate(w.walletAddress, 12)}</code>
                      <strong>{formatUsd(w.tvl)}</strong>
                    </div>
                    {w.positions?.map((pos, j) => (
                      <div key={j} className="mt-1 pl-3 text-xs text-slate-400">
                        • {formatChainName(pos.chainId)}: {pos.protocol} – {formatUsd(pos.amount)}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </Callout>
      )}
    </Panel>
  );
}
