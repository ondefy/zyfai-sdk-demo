import { useState } from "react";
import type {
  OnchainEarningsResponse,
  DailyEarningsResponse,
  DailyApyHistoryResponse,
} from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { formatUsd, formatChainName } from "../utils/formatters";
import {
  averageTokenNumbers,
  blendedApyFromDailyEntry,
  sumTokenAmountStrings,
} from "../utils/token-metrics";

function TokenAmountGrid({
  title,
  record,
}: {
  title: string;
  record: Record<string, string> | undefined;
}) {
  const entries = record ? Object.entries(record) : [];
  if (entries.length === 0) return null;
  return (
    <div className="mt-3">
      <span className="text-xs font-semibold uppercase text-slate-400">
        {title}
      </span>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {entries.map(([sym, raw]) => (
          <div
            key={sym}
            className="rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-center"
          >
            <span className="block text-xs text-slate-400">{sym}</span>
            <strong className="text-sm text-green-400">
              {formatUsd(parseFloat(raw || "0"))}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EarningsPanel() {
  const { sdk, isBusy, setStatus, setIsBusy, walletInfo, ensureWallet } =
    useSdk();

  const [onchainEarnings, setOnchainEarnings] =
    useState<OnchainEarningsResponse | null>(null);
  const [dailyEarnings, setDailyEarnings] =
    useState<DailyEarningsResponse | null>(null);
  const [apyHistory, setApyHistory] =
    useState<DailyApyHistoryResponse | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [apyDays, setApyDays] = useState<"7D" | "14D" | "30D">("7D");

  const fetchOnchainEarnings = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching onchain earnings…");
      const res = await sdk!.getOnchainEarnings(walletInfo.address);
      setOnchainEarnings(res);
      const total = sumTokenAmountStrings(res.data.totalEarningsByToken);
      setStatus(`Onchain earnings loaded: ${formatUsd(total)} (all tokens).`);
    } catch (e) {
      setStatus(`Failed to get earnings: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const calculateEarnings = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Calculating onchain earnings…");
      const res = await sdk!.calculateOnchainEarnings(walletInfo.address);
      setOnchainEarnings(res);
      const total = sumTokenAmountStrings(res.data.totalEarningsByToken);
      setStatus(`Earnings recalculated: ${formatUsd(total)} (all tokens).`);
    } catch (e) {
      setStatus(`Failed to calculate: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchDailyEarnings = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching daily earnings…");
      const res = await sdk!.getDailyEarnings(
        walletInfo.address,
        startDate || undefined,
        endDate || undefined
      );
      setDailyEarnings(res);
      setStatus(`Loaded ${res.count} daily earnings entries.`);
    } catch (e) {
      setStatus(`Failed to get daily earnings: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchApyHistory = async () => {
    if (!walletInfo?.address) {
      setStatus("Please resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching APY history…");
      const res = await sdk!.getDailyApyHistory(walletInfo.address, apyDays);
      setApyHistory(res);
      const avg =
        averageTokenNumbers(res.weightedApyWithRzfiAfterFee) ?? 0;
      setStatus(
        `APY history loaded. Avg weighted APY (incl. RZFI): ${avg.toFixed(2)}%`
      );
    } catch (e) {
      setStatus(`Failed to get APY history: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const smartWalletReady = !!walletInfo?.address;
  const d = onchainEarnings?.data;

  return (
    <Panel
      title="Earnings & APY"
      description="Onchain figures are per token (USDC, WETH, …). Current earnings are grouped by chain, then by token."
    >
      <section className="mb-6">
        <h3 className="mb-2 text-base font-semibold text-white">
          Onchain Earnings
        </h3>
        <div className="flex flex-wrap gap-3">
          <Btn onClick={fetchOnchainEarnings} disabled={isBusy || !smartWalletReady}>
            Get Earnings
          </Btn>
          <Btn onClick={calculateEarnings} disabled={isBusy || !smartWalletReady}>
            Calculate / Refresh
          </Btn>
        </div>

        {d && (
          <>
            <TokenAmountGrid title="Total by token" record={d.totalEarningsByToken} />
            <TokenAmountGrid
              title="Lifetime by token"
              record={d.lifetimeEarningsByToken}
            />
            {d.currentEarningsByChain &&
              Object.keys(d.currentEarningsByChain).length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Current by chain
                  </span>
                  {Object.entries(d.currentEarningsByChain).map(
                    ([chainId, byToken]) => (
                      <div key={chainId}>
                        <span className="text-sm text-white">
                          {formatChainName(chainId)}
                        </span>
                        <div className="mt-1 flex flex-col gap-1">
                          {Object.entries(byToken).map(([sym, raw]) => (
                            <DetailRow key={sym} label={sym}>
                              {formatUsd(parseFloat(raw || "0"))}
                            </DetailRow>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            {d.unrealizedEarnings &&
              Object.keys(d.unrealizedEarnings).length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Unrealized (by bucket / chain)
                  </span>
                  {Object.entries(d.unrealizedEarnings).map(([bucket, byToken]) => (
                    <div key={bucket}>
                      <span className="text-sm text-white">
                        {formatChainName(bucket)}
                      </span>
                      <div className="mt-1 flex flex-col gap-1">
                        {Object.entries(byToken).map(([sym, raw]) => (
                          <DetailRow key={sym} label={sym}>
                            {formatUsd(parseFloat(raw || "0"))}
                          </DetailRow>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}
      </section>

      <section className="mb-6">
        <h3 className="mb-2 text-base font-semibold text-white">
          Daily Earnings
        </h3>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <Btn onClick={fetchDailyEarnings} disabled={isBusy || !smartWalletReady}>
          Get Daily Earnings
        </Btn>

        {dailyEarnings && dailyEarnings.data.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Daily Breakdown ({dailyEarnings.count} entries)
            </span>
            {dailyEarnings.data.slice(0, 10).map((entry, i) => {
              const delta = sumTokenAmountStrings(
                entry.daily_total_delta_by_token
              );
              const total = sumTokenAmountStrings(entry.total_earnings_by_token);
              return (
                <div
                  key={i}
                  className="rounded-lg border border-dark-600 bg-dark-900 p-3"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-white">
                      {entry.snapshot_date}
                    </strong>
                    <span className="text-xs text-slate-400">
                      Δ total: {formatUsd(delta)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-300">
                    Day total (all tokens): {formatUsd(total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-base font-semibold text-white">APY History</h3>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Period
            <select
              value={apyDays}
              onChange={(e) =>
                setApyDays(e.target.value as "7D" | "14D" | "30D")
              }
              className="rounded-lg border border-dark-500 bg-dark-700 py-2 pl-3 pr-10 text-sm text-white"
            >
              <option value="7D">7 Days</option>
              <option value="14D">14 Days</option>
              <option value="30D">30 Days</option>
            </select>
          </label>
          <Btn onClick={fetchApyHistory} disabled={isBusy || !smartWalletReady}>
            Get APY History
          </Btn>
        </div>

        {apyHistory && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-600 bg-dark-900 p-4">
              <span className="block text-xs text-slate-400">
                Weighted APY (RZFI, after fee) by token
              </span>
              {apyHistory.weightedApyWithRzfiAfterFee &&
              Object.keys(apyHistory.weightedApyWithRzfiAfterFee).length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-primary">
                  {Object.entries(apyHistory.weightedApyWithRzfiAfterFee).map(
                    ([sym, v]) => (
                      <li key={sym}>
                        {sym}: {v.toFixed(2)}%
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">—</p>
              )}
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-900 p-4">
              <span className="block text-xs text-slate-400">
                Weighted APY (after fee) by token
              </span>
              {apyHistory.weightedApyAfterFee &&
              Object.keys(apyHistory.weightedApyAfterFee).length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-primary">
                  {Object.entries(apyHistory.weightedApyAfterFee).map(
                    ([sym, v]) => (
                      <li key={sym}>
                        {sym}: {v.toFixed(2)}%
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">—</p>
              )}
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-900 p-4 text-center sm:col-span-2">
              <span className="block text-xs text-slate-400">Total Days</span>
              <strong className="text-xl text-primary">
                {apyHistory.totalDays}
              </strong>
            </div>
          </div>
        )}

        {apyHistory?.history && Object.keys(apyHistory.history).length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {Object.entries(apyHistory.history)
              .slice(0, 10)
              .map(([date, entry]) => (
                <div
                  key={date}
                  className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm"
                >
                  <span className="text-white">{date}</span>
                  <span className="text-slate-300">
                    {blendedApyFromDailyEntry(entry).toFixed(2)}%
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {!smartWalletReady && (
        <p className="mt-4 text-sm italic text-slate-500">
          Resolve your Smart Wallet first to access earnings data.
        </p>
      )}
    </Panel>
  );
}
