import { useState } from "react";
import type {
  OnchainEarningsResponse,
  DailyEarningsResponse,
  DailyApyHistoryResponse,
} from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { formatUsd, formatChainName } from "../utils/formatters";

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

  // ---- Handlers ----

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
      setStatus(`Onchain earnings loaded: ${formatUsd(res.data.totalEarnings)}`);
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
      setStatus(`Earnings recalculated: ${formatUsd(res.data.totalEarnings)}`);
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
      setStatus(
        `APY history loaded. Average: ${res.averageWeightedApy?.toFixed(2) ?? 0}%`
      );
    } catch (e) {
      setStatus(`Failed to get APY history: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const smartWalletReady = !!walletInfo?.address;

  return (
    <Panel title="Earnings & APY" description="Track onchain earnings, daily breakdown, and APY history.">
      {/* ---------- Onchain Earnings ---------- */}
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

        {onchainEarnings?.data && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total", value: onchainEarnings.data.totalEarnings },
              { label: "Current", value: onchainEarnings.data.currentEarnings },
              { label: "Lifetime", value: onchainEarnings.data.lifetimeEarnings },
              ...(onchainEarnings.data.unrealizedEarnings !== undefined
                ? [{ label: "Unrealized", value: onchainEarnings.data.unrealizedEarnings }]
                : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-dark-600 bg-dark-900 p-4 text-center"
              >
                <span className="block text-xs text-slate-400">{label}</span>
                <strong className="text-lg text-green-400">
                  {formatUsd(value)}
                </strong>
              </div>
            ))}
          </div>
        )}

        {onchainEarnings?.data?.currentEarningsByChain && (
          <div className="mt-3 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-slate-400">
              By Chain
            </span>
            {Object.entries(onchainEarnings.data.currentEarningsByChain).map(
              ([chain, amount]) => (
                <DetailRow key={chain} label={formatChainName(chain)}>
                  {formatUsd(amount)}
                </DetailRow>
              )
            )}
          </div>
        )}
      </section>

      {/* ---------- Daily Earnings ---------- */}
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
            {dailyEarnings.data.slice(0, 10).map((entry, i) => (
              <div
                key={i}
                className="rounded-lg border border-dark-600 bg-dark-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-white">
                    {entry.snapshot_date}
                  </strong>
                  <span className="text-xs text-slate-400">
                    Delta: {formatUsd(entry.daily_total_delta)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Total</span>
                    <div className="font-semibold text-white">
                      {formatUsd(entry.total_earnings)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Current</span>
                    <div className="font-semibold text-white">
                      {formatUsd(entry.total_current_earnings)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Lifetime</span>
                    <div className="font-semibold text-white">
                      {formatUsd(entry.total_lifetime_earnings)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- APY History ---------- */}
      <section>
        <h3 className="mb-2 text-base font-semibold text-white">
          APY History
        </h3>
        <div className="mb-3 flex items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            Period
            <select
              value={apyDays}
              onChange={(e) =>
                setApyDays(e.target.value as "7D" | "14D" | "30D")
              }
              className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
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
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-dark-600 bg-dark-900 p-4 text-center">
              <span className="block text-xs text-slate-400">
                Average Weighted APY
              </span>
              <strong className="text-xl text-primary">
                {apyHistory.averageWeightedApy?.toFixed(2) ?? 0}%
              </strong>
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-900 p-4 text-center">
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
                    {(entry.apy ?? entry.weightedApy ?? 0).toFixed(2)}%
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
