import { useState } from "react";
import type { ActiveWalletsResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, Callout } from "./ui";
import { truncate, formatChainName } from "../utils/formatters";

export function ActiveWalletsPanel() {
  const { sdk, isBusy, selectedChain, setStatus, setIsBusy, ensureSdk } = useSdk();
  const [data, setData] = useState<ActiveWalletsResponse | null>(null);

  const fetch = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching active wallets…");
      const res = await sdk!.getActiveWallets(selectedChain);
      setData(res);
      setStatus(`${res.count} active wallets on ${formatChainName(selectedChain)}`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel title="Active Wallets" description="Active smart wallets on the selected chain.">
      <Btn onClick={fetch} disabled={isBusy}>Get Active Wallets</Btn>

      {data && (
        <Callout>
          <strong>
            {data.count} wallets on {formatChainName(data.chainId)}
          </strong>
          <div className="mt-2 flex flex-col gap-1">
            {data.wallets.slice(0, 5).map((w, i) => (
              <div key={i} className="text-sm">
                <code className="text-xs text-slate-300">{truncate(w.smartWallet, 12)}</code>
                <span className="ml-2 text-xs text-slate-500">
                  {w.chains.map(formatChainName).join(", ")}
                </span>
              </div>
            ))}
            {data.count > 5 && (
              <p className="text-xs italic text-slate-500">…and {data.count - 5} more</p>
            )}
          </div>
        </Callout>
      )}
    </Panel>
  );
}
