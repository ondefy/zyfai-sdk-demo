import { useState } from "react";
import type { CustomizationConfig, GetSelectedPoolsResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { formatChainName } from "../utils/formatters";

export function PoolCustomizationPanel() {
  const {
    sdk,
    address,
    isBusy,
    setStatus,
    setIsBusy,
    setUserDetails,
    protocols,
    ensureSdk,
    ensureWallet,
  } = useSdk();

  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [chainId, setChainId] = useState(8453);
  const [autoselect, setAutoselect] = useState(false);
  const [availablePools, setAvailablePools] = useState<string[]>([]);
  const [selectedPools, setSelectedPools] = useState<string[]>([]);
  const [currentConfig, setCurrentConfig] = useState<GetSelectedPoolsResponse | null>(null);
  const [batch, setBatch] = useState<CustomizationConfig[]>([]);

  const fetchAvailable = async () => {
    if (!ensureSdk() || !selectedProtocol) return;
    try {
      setIsBusy(true);
      setStatus("Fetching available pools…");
      const res = await sdk!.getAvailablePools(selectedProtocol);
      setAvailablePools(res.pools);
      setStatus(`Loaded ${res.pools.length} pools.`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const fetchSelected = async () => {
    if (!ensureWallet() || !selectedProtocol) return;
    try {
      setIsBusy(true);
      setStatus("Fetching current config…");
      const res = await sdk!.getSelectedPools(selectedProtocol, chainId);
      setCurrentConfig(res);
      setSelectedPools(res.pools);
      setAutoselect(res.autoselect);
      setStatus(
        res.autoselect ? "Autoselect enabled" : `${res.pools.length} pools`
      );
    } catch (e) {
      setStatus(`No config found: ${(e as Error).message}`);
      setCurrentConfig(null);
    } finally {
      setIsBusy(false);
    }
  };

  const addToBatch = () => {
    if (!selectedProtocol) return;
    const config: CustomizationConfig = {
      protocolId: selectedProtocol,
      pools: autoselect ? [] : selectedPools,
      chainId,
      autoselect,
    };
    setBatch([...batch, config]);
    setStatus(`Added to batch (${batch.length + 1} total)`);
  };

  const applyBatch = async () => {
    if (!ensureWallet() || batch.length === 0) return;
    try {
      setIsBusy(true);
      setStatus(`Applying ${batch.length} customizations…`);
      await sdk!.customizeBatch(batch);
      setStatus(`Applied ${batch.length} customizations!`);
      setBatch([]);
      const res = await sdk!.getUserDetails();
      setUserDetails(res);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel
      title="Pool Customization (Batch)"
      description="Granular control over which pools the rebalance engine uses per protocol / chain."
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Protocol
          <select
            value={selectedProtocol}
            onChange={(e) => {
              setSelectedProtocol(e.target.value);
              setAvailablePools([]);
              setSelectedPools([]);
              setCurrentConfig(null);
            }}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          >
            <option value="">-- Select --</option>
            {protocols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Chain
          <select
            value={chainId}
            onChange={(e) => setChainId(Number(e.target.value))}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white"
          >
            <option value={8453}>Base (8453)</option>
            <option value={42161}>Arbitrum (42161)</option>
            <option value={9745}>Plasma (9745)</option>
          </select>
        </label>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={autoselect}
          onChange={(e) => {
            setAutoselect(e.target.checked);
            if (e.target.checked) setSelectedPools([]);
          }}
          className="accent-primary"
        />
        Autoselect (let engine choose best pools)
      </label>

      <div className="mb-4 flex flex-wrap gap-3">
        <Btn onClick={fetchAvailable} disabled={isBusy || !selectedProtocol}>
          Get Available Pools
        </Btn>
        <Btn onClick={fetchSelected} disabled={isBusy || !address || !selectedProtocol}>
          Get Current Config
        </Btn>
      </div>

      {!autoselect && availablePools.length > 0 && (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-dark-500 p-2">
          <span className="mb-1 block text-xs font-semibold text-slate-400">
            Select pools ({selectedPools.length}/{availablePools.length})
          </span>
          {availablePools.map((pool) => (
            <label key={pool} className="mb-1 flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedPools.includes(pool)}
                onChange={(e) =>
                  e.target.checked
                    ? setSelectedPools([...selectedPools, pool])
                    : setSelectedPools(selectedPools.filter((p) => p !== pool))
                }
                className="accent-primary"
              />
              {pool}
            </label>
          ))}
        </div>
      )}

      <Btn onClick={addToBatch} disabled={isBusy || !selectedProtocol}>
        Add to Batch
      </Btn>

      {currentConfig && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dark-600 bg-dark-900 p-3">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Current Config
          </span>
          <DetailRow label="Autoselect">
            {currentConfig.autoselect ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Pools">
            {currentConfig.autoselect
              ? "Engine chooses"
              : `${currentConfig.pools.length} pools`}
          </DetailRow>
          {!currentConfig.autoselect && currentConfig.pools.length > 0 && (
            <p className="text-xs text-slate-400">
              {currentConfig.pools.join(", ")}
            </p>
          )}
        </div>
      )}

      {batch.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-white">
            Batch ({batch.length})
          </h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {batch.map((c, i) => {
              const proto = protocols.find((p) => p.id === c.protocolId);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/5 p-2"
                >
                  <div>
                    <span className="text-sm font-semibold text-white">
                      {proto?.name || c.protocolId} – {formatChainName(c.chainId)}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {c.autoselect ? "auto" : `${c.pools.length} pool(s)`}
                    </span>
                  </div>
                  <button
                    onClick={() => setBatch(batch.filter((_, j) => j !== i))}
                    className="cursor-pointer rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-3">
            <Btn variant="success" onClick={applyBatch} disabled={isBusy || !address}>
              Apply Batch ({batch.length})
            </Btn>
            <Btn variant="danger" onClick={() => setBatch([])} disabled={isBusy}>
              Clear
            </Btn>
          </div>
        </div>
      )}

      {protocols.length === 0 && (
        <p className="mt-4 text-sm italic text-slate-500">
          Fetch protocols first.
        </p>
      )}
    </Panel>
  );
}
