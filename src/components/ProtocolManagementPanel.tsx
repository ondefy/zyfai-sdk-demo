import { useState } from "react";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel } from "./ui";
import { filterSupportedChains, formatChainName } from "../utils/formatters";

export function ProtocolManagementPanel() {
  const {
    sdk,
    address,
    isBusy,
    setStatus,
    setIsBusy,
    setUserDetails,
    protocols,
    setProtocols,
    selectedChain,
    ensureSdk,
    ensureWallet,
  } = useSdk();

  const [selected, setSelected] = useState<string[]>([]);

  const fetchProtocols = async () => {
    if (!ensureSdk()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching protocols…");
      const res = await sdk!.getAvailableProtocols(selectedChain);
      setProtocols(res.protocols);
      setStatus(`Loaded ${res.protocols.length} protocols.`);
    } catch (e) {
      setStatus(`Failed to load protocols: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const updateProtocols = async () => {
    if (!ensureWallet()) return;
    if (selected.length === 0) {
      setStatus("Select at least one protocol.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Updating protocols…");
      await sdk!.updateUserProfile({ protocols: selected });
      setStatus(`Protocols updated (${selected.length}).`);
      const res = await sdk!.getUserDetails();
      setUserDetails(res);
    } catch (e) {
      setStatus(`Failed to update protocols: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Panel
      title="Protocol Management"
      description="Select specific protocols for yield optimization."
    >
      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchProtocols} disabled={isBusy}>
          Load Protocols
        </Btn>
        <Btn
          onClick={updateProtocols}
          disabled={isBusy || !address || selected.length === 0}
        >
          Update ({selected.length} selected)
        </Btn>
      </div>

      {protocols.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase text-slate-400">
            {protocols.length} protocols available
          </span>
          {protocols.map((p) => {
            const isSelected = selected.includes(p.id);
            const chains = filterSupportedChains(p.chains);
            return (
              <div
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-dark-600 bg-dark-900 hover:border-dark-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="accent-primary"
                  />
                  <strong className="text-sm text-white">{p.name}</strong>
                  <span className="text-xs text-slate-400">{p.type}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Chains: {chains.map(formatChainName).join(", ")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {p.description ?? "No description."}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-500">
          Load protocols to select and update.
        </p>
      )}
    </Panel>
  );
}
