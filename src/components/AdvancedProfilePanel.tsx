import { useEffect, useState } from "react";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";

export function AdvancedProfilePanel() {
  const {
    sdk,
    address,
    isBusy,
    setStatus,
    setIsBusy,
    userDetails,
    setUserDetails,
    protocols,
    ensureWallet,
  } = useSdk();

  const [selectedProtocolIds, setSelectedProtocolIds] = useState<string[]>([]);
  const [autoSelect, setAutoSelect] = useState(true);
  const [splitting, setSplitting] = useState(false);
  const [minSplits, setMinSplits] = useState(2);
  const [crossChain, setCrossChain] = useState(false);
  const [omniAccount, setOmniAccount] = useState(false);
  const [autocompounding, setAutocompounding] = useState(true);
  const [agentName, setAgentName] = useState("");

  // Sync with user details
  useEffect(() => {
    if (!userDetails) return;
    const u = userDetails.user;
    setSplitting(u.splitting ?? false);
    setMinSplits(u.minSplits ?? 2);
    setCrossChain(u.crosschainStrategy ?? false);
    setOmniAccount(u.omniAccount ?? false);
    setAutocompounding(u.autocompounding ?? true);
    setAutoSelect(u.autoSelectProtocols ?? true);
    if (u.agentName) setAgentName(u.agentName);
    if (u.protocols?.length) setSelectedProtocolIds(u.protocols.map((p) => p.id));
  }, [userDetails]);

  const handleUpdate = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Updating profile…");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        autoSelectProtocols: autoSelect,
        splitting,
        crosschainStrategy: crossChain,
        omniAccount,
        autocompounding,
      };
      if (splitting) payload.minSplits = minSplits;
      if (selectedProtocolIds.length) payload.protocols = selectedProtocolIds;
      if (agentName.trim()) payload.agentName = agentName.trim();

      await sdk!.updateUserProfile(payload);
      setStatus("Profile updated!");
      const res = await sdk!.getUserDetails();
      setUserDetails(res);
    } catch (e) {
      setStatus(`Failed to update profile: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const user = userDetails?.user;

  return (
    <Panel
      title="Advanced Profile Configuration"
      description="Configure protocols, splitting, cross-chain, omni-account, and more."
    >
      {/* Protocol selection */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-white">
          Protocol Selection
        </h3>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={autoSelect}
            onChange={(e) => setAutoSelect(e.target.checked)}
            className="accent-primary"
          />
          Auto-select protocols (recommended)
        </label>
        {!autoSelect && (
          <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-dark-500 p-2">
            {protocols.length > 0 ? (
              protocols.map((p) => (
                <label
                  key={p.id}
                  className="mb-1 flex items-center gap-2 text-sm text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedProtocolIds.includes(p.id)}
                    onChange={(e) =>
                      e.target.checked
                        ? setSelectedProtocolIds([...selectedProtocolIds, p.id])
                        : setSelectedProtocolIds(
                            selectedProtocolIds.filter((id) => id !== p.id)
                          )
                    }
                    className="accent-primary"
                  />
                  {p.name} ({p.type})
                </label>
              ))
            ) : (
              <p className="text-xs italic text-slate-500">
                Fetch protocols first.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Feature toggles */}
      <div className="mb-4 space-y-2">
        <h3 className="mb-2 text-sm font-semibold text-white">Features</h3>
        <Checkbox label="Position Splitting" checked={splitting} onChange={setSplitting} />
        {splitting && (
          <div className="ml-6">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Min Splits (1-4):
              <input
                type="number"
                min={1}
                max={4}
                value={minSplits}
                onChange={(e) => setMinSplits(parseInt(e.target.value) || 2)}
                className="w-16 rounded border border-dark-500 bg-dark-700 px-2 py-1 text-sm text-white"
              />
            </label>
          </div>
        )}
        <Checkbox label="Cross-Chain Strategy" checked={crossChain} onChange={setCrossChain} />
        <Checkbox label="Omni-Account" checked={omniAccount} onChange={setOmniAccount} />
        <Checkbox label="Auto-compounding" checked={autocompounding} onChange={setAutocompounding} />
      </div>

      {/* Agent name */}
      <label className="mb-4 flex flex-col gap-1 text-sm text-slate-400">
        Agent Name (optional)
        <input
          type="text"
          placeholder="My DeFi Agent"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:border-primary focus:outline-none"
        />
      </label>

      <Btn onClick={handleUpdate} disabled={isBusy || !address}>
        Update Profile
      </Btn>

      {/* Current config display */}
      {user && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dark-600 bg-dark-900 p-3">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Current Configuration
          </span>
          <DetailRow label="Auto-select Protocols">
            {user.autoSelectProtocols ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Protocols Configured">
            {user.protocols.length}
          </DetailRow>
          <DetailRow label="Splitting">
            {user.splitting ? `Yes (Min: ${user.minSplits || "N/A"})` : "No"}
          </DetailRow>
          <DetailRow label="Cross-Chain">
            {user.crosschainStrategy ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Omni-Account">
            {user.omniAccount ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Auto-compounding">
            {user.autocompounding !== false ? "Yes" : "No"}
          </DetailRow>
          {user.agentName && (
            <DetailRow label="Agent Name">{user.agentName}</DetailRow>
          )}
        </div>
      )}

      {!address && (
        <p className="mt-4 text-sm italic text-slate-500">
          Connect your wallet to configure advanced features.
        </p>
      )}
    </Panel>
  );
}

// Small helper component
function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {label}
    </label>
  );
}
