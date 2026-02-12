import { useState } from "react";
import type { DebankPortfolioResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, StatCard } from "./ui";
import { formatUsd } from "../utils/formatters";

export function PortfolioPanel() {
  const { sdk, isBusy, setStatus, setIsBusy, walletInfo, ensureWallet } = useSdk();
  const [portfolio, setPortfolio] = useState<DebankPortfolioResponse | null>(null);

  const fetch = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching Debank portfolio…");
      const res = await sdk!.getDebankPortfolio(walletInfo.address);
      setPortfolio(res);
      setStatus(`Portfolio: ${formatUsd(res.totalValueUsd)}`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const chainEntries = portfolio?.chains ? Object.entries(portfolio.chains) : [];
  const calculatedTotal = chainEntries.reduce((sum, [, d]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = d as any;
    const v = data.totalValueUsd ?? data.summary?.totalValue ?? 0;
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
  const totalValue = portfolio?.totalValueUsd || calculatedTotal;

  return (
    <Panel title="Debank Portfolio" description="Multi-chain portfolio data.">
      <Btn onClick={fetch} disabled={isBusy || !walletInfo?.address}>
        Get Portfolio
      </Btn>

      {portfolio && (
        <div className="mt-4">
          <StatCard label="Total Portfolio Value" value={formatUsd(totalValue)} />
          {chainEntries.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {chainEntries.map(([key, d]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = d as any;
                const name = data.chainName || key.charAt(0).toUpperCase() + key.slice(1);
                const value = data.totalValueUsd ?? data.summary?.totalValue ?? 0;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm"
                  >
                    <span className="text-white">{name}</span>
                    <span className="text-slate-300">{formatUsd(value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
