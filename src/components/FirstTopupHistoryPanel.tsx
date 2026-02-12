import { useState } from "react";
import type { FirstTopupResponse, HistoryResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow, Badge } from "./ui";
import { truncate } from "../utils/formatters";

export function FirstTopupHistoryPanel() {
  const { sdk, isBusy, selectedChain, setStatus, setIsBusy, walletInfo, ensureWallet } =
    useSdk();

  const [topup, setTopup] = useState<FirstTopupResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);

  const fetchTopup = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching first topup…");
      const res = await sdk!.getFirstTopup(walletInfo.address, selectedChain);
      setTopup(res);
      setStatus(res.date ? `First topup: ${res.date}` : "No topup found.");
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchHistory = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching history…");
      const res = await sdk!.getHistory(walletInfo.address, selectedChain, {
        limit: 20,
      });
      setHistory(res);
      setStatus(`Loaded ${res.data.length} entries.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel title="First Topup & History" description="First deposit date and transaction history.">
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchTopup} disabled={isBusy || !walletInfo?.address}>
          Get First Topup
        </Btn>
        <Btn onClick={fetchHistory} disabled={isBusy || !walletInfo?.address}>
          Get History
        </Btn>
      </div>

      {topup && (
        <div className="mt-4 flex flex-col gap-2">
          <DetailRow label="First Topup">{topup.date || "N/A"}</DetailRow>
          {topup.amount && <DetailRow label="Amount">{topup.amount}</DetailRow>}
        </div>
      )}

      {history && history.data.length > 0 && (
        <div className="mt-4">
          <span className="text-xs font-semibold uppercase text-slate-400">
            History ({history.total} total)
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {history.data.slice(0, 10).map((entry, i) => (
              <div
                key={entry.id || i}
                className="rounded-lg border border-dark-600 bg-dark-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-white">
                    {entry.action || "Transaction"}
                    {entry.strategy && (
                      <span className="ml-2 text-xs text-slate-400">
                        {entry.strategy}
                      </span>
                    )}
                  </strong>
                  <span className="text-xs text-slate-500">
                    {entry.date || "Unknown"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {entry.transactionHash && (
                    <code className="text-xs text-slate-400">
                      {truncate(entry.transactionHash, 12)}
                    </code>
                  )}
                  {entry.rebalance && <Badge color="purple">Rebalance</Badge>}
                  {entry.crosschain && <Badge color="green">Cross-chain</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
