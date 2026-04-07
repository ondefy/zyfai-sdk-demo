import { useEffect, useState } from "react";
import type { Portfolio, PositionSlot } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn } from "./ui";
import {
  CHAIN_OPTIONS,
  formatUsd,
  isSupportedChain,
  truncate,
} from "../utils/formatters";

function formatPositionBalance(balance: string, decimals = 6): string {
  const value = balance.startsWith("0x")
    ? Number(BigInt(balance)) / 10 ** decimals
    : Number(balance) / 10 ** decimals;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ChainSelector() {
  const {
    sdk,
    isBusy,
    address,
    selectedChain,
    setSelectedChain,
    setStatus,
    setIsBusy,
    setProtocols,
    ensureSdk,
    ensureWallet,
  } = useSdk();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    setPortfolio(null);
  }, [selectedChain]);

  const fetchProtocols = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching available protocols…");
      const res = await sdk!.getAvailableProtocols(selectedChain);
      setProtocols(res.protocols);
      setStatus(`Loaded ${res.protocols.length} protocols.`);
    } catch (e) {
      setStatus(`Failed to load protocols: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchPositions = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching positions…");
      const res = await sdk!.getPositions(address!, selectedChain);
      const data = res.portfolio ?? null;
      setPortfolio(data);
      const count = data?.positions?.length ?? 0;
      const stale = data?.staleBalances?.length ?? 0;
      setStatus(
        count > 0 || stale > 0
          ? `Loaded ${count} position(s), ${stale} pending fund(s).`
          : "No positions found."
      );
    } catch (e) {
      setStatus(`Failed to load positions: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const positions = portfolio?.positions ?? [];
  const staleBalances = portfolio?.staleBalances ?? [];

  return (
    <div className="rounded-xl border border-dark-600 bg-dark-900/80 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">Target Chain</span>
          <select
            value={selectedChain}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (isSupportedChain(next)) setSelectedChain(next);
            }}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          >
            {CHAIN_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          <Btn onClick={fetchProtocols} disabled={isBusy}>
            Fetch Protocols
          </Btn>
          <Btn onClick={fetchPositions} disabled={isBusy || !address}>
            Fetch Positions
          </Btn>
        </div>
      </div>

      {portfolio && (
        <div className="mt-4 space-y-4 border-t border-dark-600 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
            <span>
              <strong className="text-slate-300">Smart Wallet:</strong>{" "}
              <code className="text-[#4499E1]">
                {truncate(portfolio.smartWallet ?? "", 10)}
              </code>
            </span>
            <span>
              <strong className="text-slate-300">Strategy:</strong>{" "}
              {portfolio.strategy ?? "N/A"}
            </span>
            <span>
              <strong className="text-slate-300">Session key:</strong>{" "}
              {portfolio.hasActiveSessionKey ? "Active" : "Inactive"}
            </span>
          </div>

          {staleBalances.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                Pending funds
              </h3>
              <ul className="flex flex-col gap-2">
                {staleBalances.map((stale, idx) => (
                  <li
                    key={`stale-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm"
                  >
                    <span className="text-white">
                      {stale.tokenSymbol}{" "}
                      <span className="text-slate-400">· chain {stale.chainId}</span>
                    </span>
                    <span className="font-medium text-amber-400">
                      ${formatPositionBalance(stale.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {positions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-white">
                Active positions
              </h3>
              <ul className="flex flex-col gap-2">
                {positions.map((slot: PositionSlot, idx: number) => {
                  const underlying =
                    slot.underlyingAmount ?? slot.amount ?? "0";
                  const apy = slot.pool_apy;
                  const tvl = slot.pool_tvl;
                  return (
                    <li
                      key={`${slot.protocol_id}-${idx}`}
                      className="rounded-lg border border-dark-600 bg-dark-800/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {slot.protocol_icon ? (
                            <img
                              src={slot.protocol_icon}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {slot.protocol_name ?? slot.protocol_id ?? "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {slot.pool
                                ? truncate(slot.pool, 12)
                                : "Pool n/a"}{" "}
                              <span className="text-slate-400">
                                {slot.chain ?? ""}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-white">
                            ${formatPositionBalance(underlying)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {slot.token_symbol ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-dark-600 pt-2 text-xs text-slate-400">
                        <span>
                          APY:{" "}
                          {apy != null ? (
                            <span className="text-emerald-400">
                              {Number(apy).toFixed(2)}%
                            </span>
                          ) : (
                            "n/a"
                          )}
                        </span>
                        <span>
                          TVL: {tvl != null ? formatUsd(tvl) : "n/a"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {positions.length === 0 && staleBalances.length === 0 && (
            <p className="text-sm italic text-slate-500">
              No positions or pending funds on this chain.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
