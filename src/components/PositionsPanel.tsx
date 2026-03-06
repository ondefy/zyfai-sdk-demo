import { useState } from "react";
import type { Portfolio, PositionSlot } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel } from "./ui";
import { formatUsd, truncate } from "../utils/formatters";

export function PositionsPanel() {
  const { sdk, address, isBusy, selectedChain, setStatus, setIsBusy, ensureWallet } =
    useSdk();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [lookupAddr, setLookupAddr] = useState("");

  const fetchPositions = async (targetAddr?: string) => {
    const addrToUse = targetAddr || address;
    if (!targetAddr && !ensureWallet()) return;
    if (!addrToUse) {
      setStatus("Enter a wallet address.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching positions…");
      const res = await sdk!.getPositions(addrToUse, selectedChain);
      // res.portfolio contains positions (PositionSlot[]) and staleBalances
      const portfolioData = res.portfolio ?? null;
      setPortfolio(portfolioData);
      
      const posCount = portfolioData?.positions?.length ?? 0;
      const staleCount = portfolioData?.staleBalances?.length ?? 0;
      setStatus(
        posCount > 0 || staleCount > 0
          ? `Loaded ${posCount} positions, ${staleCount} stale balances.`
          : "No positions found."
      );
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const positions = portfolio?.positions ?? [];
  const staleBalances = portfolio?.staleBalances ?? [];

  // Format balance (can be hex or decimal string)
  const formatBalance = (balance: string, decimals = 6): string => {
    const value = balance.startsWith("0x")
      ? Number(BigInt(balance)) / Math.pow(10, decimals)
      : Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Panel title="Positions" description="View Zyfai positions for your wallet or any address.">
      <div className="mb-3 flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-400">
          Address (optional – leave empty for connected wallet)
          <input
            type="text"
            placeholder="0x…"
            value={lookupAddr}
            onChange={(e) => setLookupAddr(e.target.value)}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:border-primary focus:outline-none"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <Btn onClick={() => fetchPositions()} disabled={isBusy || !address}>
          My Positions
        </Btn>
        <Btn
          onClick={() => fetchPositions(lookupAddr.trim())}
          disabled={isBusy || !lookupAddr.trim()}
        >
          Lookup Address
        </Btn>
      </div>

      {/* Portfolio Info */}
      {portfolio && (
        <div className="mt-4 rounded-lg border border-[#2a3640] bg-[#1a242d] p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
            <span>
              <strong className="text-slate-300">Smart Wallet:</strong>{" "}
              <code className="text-[#4499E1]">{truncate(portfolio.smartWallet ?? "", 10)}</code>
            </span>
            <span>
              <strong className="text-slate-300">Strategy:</strong>{" "}
              {portfolio.strategy ?? "N/A"}
            </span>
            <span>
              <strong className="text-slate-300">Session Key:</strong>{" "}
              {portfolio.hasActiveSessionKey ? "✓ Active" : "✗ Inactive"}
            </span>
            <span>
              <strong className="text-slate-300">Splitting:</strong>{" "}
              {portfolio.splitting ? `Yes (min ${portfolio.minSplits})` : "No"}
            </span>
            <span>
              <strong className="text-slate-300">Cross-chain:</strong>{" "}
              {portfolio.crosschainStrategy ? "Yes" : "No"}
            </span>
          </div>
        </div>
      )}

      {/* Stale Balances (funds not yet deployed) */}
      {staleBalances.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-white">
            Pending Funds <span className="font-normal text-slate-400">(not yet deployed)</span>
          </h3>
          <div className="flex flex-col gap-2">
            {staleBalances.map((stale, idx) => (
              <div
                key={`stale-${idx}`}
                className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <span className="font-medium text-white">{stale.tokenSymbol}</span>
                    <span className="ml-2 text-xs text-slate-400">Chain {stale.chainId}</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-amber-400">
                  ${formatBalance(stale.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Positions */}
      {positions.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-white">
            Active Positions <span className="font-normal text-slate-400">(deployed in protocols)</span>
          </h3>
          <div className="flex flex-col gap-3">
            {positions.map((slot: PositionSlot, idx: number) => {
              const underlying = slot.underlyingAmount ?? slot.amount ?? "0";
              const apy = slot.pool_apy;
              const tvl = slot.pool_tvl;

              return (
                <article
                  key={`${slot.protocol_id}-${idx}`}
                  className="rounded-lg border border-dark-600 bg-dark-900 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {slot.protocol_icon && (
                        <img
                          src={slot.protocol_icon}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      )}
                      <div>
                        <strong className="text-sm text-white">
                          {slot.protocol_name ?? slot.protocol_id ?? "Unknown"}
                        </strong>
                        <span className="ml-2 text-xs text-slate-400">
                          {slot.chain ?? ""}
                        </span>
                        <p className="text-xs text-slate-500">
                          {slot.pool ? truncate(slot.pool, 12) : "Pool n/a"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        ${formatBalance(underlying)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {slot.token_symbol ?? "?"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-dark-600 pt-3 text-xs text-slate-400">
                    <span>
                      <strong className="text-slate-300">APY:</strong>{" "}
                      {apy != null ? (
                        <span className="text-emerald-400">{Number(apy).toFixed(2)}%</span>
                      ) : (
                        "n/a"
                      )}
                    </span>
                    <span>
                      <strong className="text-slate-300">TVL:</strong>{" "}
                      {tvl != null ? formatUsd(tvl) : "n/a"}
                    </span>
                    {slot.token_icon && (
                      <img src={slot.token_icon} alt="" className="h-4 w-4 rounded-full" />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {!portfolio && (
        <p className="mt-4 text-sm italic text-slate-500">
          Click a button to fetch positions.
        </p>
      )}

      {portfolio && positions.length === 0 && staleBalances.length === 0 && (
        <p className="mt-4 text-sm italic text-slate-500">
          No positions or pending funds found.
        </p>
      )}
    </Panel>
  );
}
