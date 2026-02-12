import { useState } from "react";
import type { Position } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel } from "./ui";
import { formatChainName, formatUsd, truncate } from "../utils/formatters";
import type { PositionBundle } from "../types";

export function PositionsPanel() {
  const { sdk, address, isBusy, selectedChain, setStatus, setIsBusy, ensureWallet } =
    useSdk();

  const [positions, setPositions] = useState<PositionBundle[]>([]);
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
      const arr = (res.positions ?? []) as PositionBundle[];
      setPositions(arr);
      setStatus(arr.length > 0 ? `Loaded ${arr.length} position bundles.` : "No positions found.");
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
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

      {positions.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {positions.map((bundle, idx) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = bundle as any;
            const chainName =
              data.chain ||
              data.positions?.[0]?.chain ||
              (data.chainId ? formatChainName(data.chainId) : "Multi-chain");

            return (
              <article
                key={`${bundle.strategy}-${idx}`}
                className="rounded-lg border border-dark-600 bg-dark-900 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <strong className="text-sm text-white">
                      {bundle.strategy ?? "Unknown"}
                    </strong>
                    <span className="ml-2 text-xs text-slate-400">
                      {chainName}
                    </span>
                  </div>
                  <code className="text-xs text-slate-500">
                    {truncate(bundle.smartWallet, 8)}
                  </code>
                </div>

                {(bundle.positions ?? []).map(
                  (slot: Position["positions"][number], si: number) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pos = slot as any;
                    const apy = pos.pool_apy ?? pos.apy;
                    const tvl = pos.pool_tvl ?? pos.tvl;
                    const underlying =
                      pos.underlyingAmount ?? pos.underlying_amount ?? pos.amount ?? "0";

                    return (
                      <div
                        key={`${slot.protocol_id}-${si}`}
                        className="mt-3 border-t border-dark-600 pt-3"
                      >
                        <div className="text-sm text-white">
                          <strong>{slot.protocol_name ?? slot.protocol_id}</strong>
                          <span className="ml-2 text-slate-400">
                            {slot.pool ?? "Pool n/a"}
                          </span>
                        </div>
                        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <li>Token: {slot.token_symbol ?? "?"}</li>
                          <li>Position: {Number(underlying) / 1e6}</li>
                          <li>
                            APY:{" "}
                            {apy != null ? `${Number(apy).toFixed(2)}%` : "n/a"}
                          </li>
                          <li>TVL: {tvl != null ? formatUsd(tvl) : "n/a"}</li>
                        </ul>
                      </div>
                    );
                  }
                )}
              </article>
            );
          })}
        </div>
      )}

      {positions.length === 0 && (
        <p className="mt-4 text-sm italic text-slate-500">
          No positions loaded yet.
        </p>
      )}
    </Panel>
  );
}
