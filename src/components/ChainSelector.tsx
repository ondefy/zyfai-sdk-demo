import { useSdk } from "../context/SdkContext";
import { Btn } from "./ui";
import { CHAIN_OPTIONS, isSupportedChain } from "../utils/formatters";

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
      const count = res.positions?.length ?? 0;
      setStatus(count > 0 ? `Loaded ${count} position bundles.` : "No positions found.");
    } catch (e) {
      setStatus(`Failed to load positions: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-dark-600 bg-dark-900/80 p-4">
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
  );
}
