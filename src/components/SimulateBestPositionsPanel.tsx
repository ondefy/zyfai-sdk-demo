import { useState } from "react";
import type { ZyfaiSDK } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow, Badge } from "./ui";
import { CHAIN_OPTIONS, formatChainName, formatUsd } from "../utils/formatters";

// `simulateBestPositions`'s param/return types aren't exported from @zyfai/sdk's
// public type barrel yet, so derive them from the method signature instead.
type SimulateResult = Awaited<ReturnType<ZyfaiSDK["simulateBestPositions"]>>;
type SimulatedPosition = SimulateResult["data"][string][number];

export function SimulateBestPositionsPanel() {
  const { sdk, isBusy, setStatus, setIsBusy, ensureSdk } = useSdk();

  const [amount, setAmount] = useState(3000);
  const [token, setToken] = useState("USDC");
  const [networks, setNetworks] = useState<number[]>([8453]);
  const [strategy, setStrategy] = useState<"conservative" | "aggressive">(
    "conservative"
  );
  const [minSplit, setMinSplit] = useState<number | "">("");
  const [protocolsFilter, setProtocolsFilter] = useState("");
  const [poolsFilter, setPoolsFilter] = useState("");

  const [result, setResult] = useState<SimulateResult | null>(null);

  const toggleNetwork = (chainId: number) => {
    setNetworks((prev) =>
      prev.includes(chainId)
        ? prev.filter((c) => c !== chainId)
        : [...prev, chainId]
    );
  };

  const simulate = async () => {
    if (!ensureSdk() || networks.length === 0) return;
    try {
      setIsBusy(true);
      setStatus("Simulating best positions…");
      const res = await sdk!.simulateBestPositions({
        amount,
        token,
        networks: networks.length === 1 ? networks[0] : networks,
        strategy,
        ...(minSplit !== "" ? { minSplit } : {}),
        ...(protocolsFilter.trim()
          ? { protocols: protocolsFilter.split(",").map((p) => p.trim()).filter(Boolean) }
          : {}),
        ...(poolsFilter.trim()
          ? { pools: poolsFilter.split(",").map((p) => p.trim()).filter(Boolean) }
          : {}),
      });
      setResult(res);
      const total = Object.values(res.data).reduce((n, arr) => n + arr.length, 0);
      setStatus(`Simulated ${total} position(s) across ${Object.keys(res.data).length} chain(s).`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const renderPosition = (pos: SimulatedPosition, i: number) => (
    <article
      key={`${pos.protocol}-${pos.pool}-${i}`}
      className="rounded-lg border border-dark-600 bg-dark-900 p-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <strong className="text-sm text-white">{pos.protocol}</strong>
          <span className="ml-2 text-xs text-slate-400">{pos.pool}</span>
        </div>
        <Badge color="green">{pos.combined_apy.toFixed(2)}% APY</Badge>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <DetailRow label="Amount">{formatUsd(pos.amount)}</DetailRow>
        <DetailRow label="Simulated APY">{pos.simulated_apy.toFixed(2)}%</DetailRow>
        <DetailRow label="Avg APY (30d)">
          {pos.averageCombinedApy30Days.toFixed(2)}%
        </DetailRow>
        <DetailRow label="TVL">{formatUsd(pos.tvl)}</DetailRow>
        <DetailRow label="Liquidity">{formatUsd(pos.liquidity)}</DetailRow>
        <DetailRow label="Calldata steps">{pos.calldata.length}</DetailRow>
        {pos.url && (
          <a
            href={pos.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View pool →
          </a>
        )}
      </div>
    </article>
  );

  return (
    <Panel
      title="Simulate Best Positions"
      description="Preview how an amount would be split across top-ranked pools — no wallet connection required."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Token
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Strategy
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as "conservative" | "aggressive")}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          >
            <option value="conservative">Conservative</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Min split (optional)
          <input
            type="number"
            min={1}
            value={minSplit}
            onChange={(e) =>
              setMinSplit(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-1 text-sm text-slate-400">
        Networks
        <div className="flex flex-wrap gap-3">
          {CHAIN_OPTIONS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={networks.includes(c.id)}
                onChange={() => toggleNetwork(c.id)}
                className="accent-primary"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Protocols filter (comma-separated, optional)
          <input
            type="text"
            placeholder="aave, compound, morpho"
            value={protocolsFilter}
            onChange={(e) => setProtocolsFilter(e.target.value)}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Pools filter (comma-separated, optional)
          <input
            type="text"
            placeholder="gauntletusdcprime"
            value={poolsFilter}
            onChange={(e) => setPoolsFilter(e.target.value)}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <Btn
        className="mt-4"
        onClick={simulate}
        disabled={isBusy || networks.length === 0}
      >
        Simulate
      </Btn>

      {result && (
        <div className="mt-4 flex flex-col gap-4">
          {Object.entries(result.messages || {}).map(([chainId, msg]) => (
            <p key={chainId} className="text-xs italic text-slate-500">
              {formatChainName(chainId)}: {msg}
            </p>
          ))}
          {Object.entries(result.data).map(([chainId, positions]) => (
            <div key={chainId}>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
                {formatChainName(chainId)} ({positions.length})
              </h3>
              <div className="flex flex-col gap-2">
                {positions.map((p, i) => renderPosition(p, i))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
