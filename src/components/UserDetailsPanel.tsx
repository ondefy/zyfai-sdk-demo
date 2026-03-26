import { useSdk, type ProfileAsset } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { formatChainName } from "../utils/formatters";

export function UserDetailsPanel() {
  const {
    sdk,
    address,
    isBusy,
    setStatus,
    setIsBusy,
    userDetails,
    setUserDetails,
    protocols: chainProtocols,
    profileAsset,
    selectProfileAsset,
    ensureWallet,
  } = useSdk();

  const fetchUserDetails = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching user details…");
      const res = await sdk!.getUserDetails(profileAsset);
      setUserDetails(res);
      setStatus("User details loaded.");
    } catch (e) {
      setStatus(`Failed to get user details: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const updateStrategy = async (s: "conservative" | "aggressive") => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus(`Updating strategy to ${s}…`);
      await sdk!.updateUserProfile({ strategy: s, asset: profileAsset });
      const res = await sdk!.getUserDetails(profileAsset);
      setUserDetails(res);
      setStatus(`Strategy updated to ${s}.`);
    } catch (e) {
      setStatus(`Failed to update strategy: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const pauseAgent = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Pausing agent…");
      await sdk!.pauseAgent();
      const res = await sdk!.getUserDetails(profileAsset);
      setUserDetails(res);
      setStatus("Agent paused. All protocols cleared.");
    } catch (e) {
      setStatus(`Failed to pause agent: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const resumeAgent = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Resuming agent…");
      await sdk!.resumeAgent();
      const res = await sdk!.getUserDetails(profileAsset);
      setUserDetails(res);
      setStatus(
        `Agent resumed. ${res.protocols?.length ?? 0} protocols on ${profileAsset} profile (see Advanced panel for both assets).`
      );
    } catch (e) {
      setStatus(`Failed to resume agent: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const u = userDetails;

  const protocolLabels =
    u?.protocols?.map(
      (id) => chainProtocols.find((p) => p.id === id)?.name ?? id
    ) ?? [];

  return (
    <Panel
      title="User Details"
      description="Profile is per-asset (USDC vs WETH). Cross-chain requires both crosschainStrategy and omniAccount — enable only when the user explicitly wants it."
    >
      <label className="mb-3 flex max-w-xs flex-col gap-1 text-sm text-slate-400">
        Profile asset
        <select
          value={profileAsset}
          onChange={(e) =>
            void selectProfileAsset(e.target.value as ProfileAsset)
          }
          className="rounded-lg border border-dark-500 bg-dark-700 py-2 pl-3 pr-10 text-sm text-white"
        >
          <option value="USDC">USDC</option>
          <option value="WETH">WETH</option>
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <Btn onClick={fetchUserDetails} disabled={isBusy || !address}>
          Get User Details
        </Btn>
        <Btn
          onClick={() => updateStrategy("conservative")}
          disabled={isBusy || !address}
        >
          Set Conservative
        </Btn>
        <Btn
          onClick={() => updateStrategy("aggressive")}
          disabled={isBusy || !address}
        >
          Set Aggressive
        </Btn>
        <Btn onClick={pauseAgent} disabled={isBusy || !address} variant="danger">
          Pause Agent
        </Btn>
        <Btn onClick={resumeAgent} disabled={isBusy || !address} variant="success">
          Resume Agent
        </Btn>
      </div>

      {u ? (
        <div className="mt-4 flex flex-col gap-3">
          <DetailRow label="EOA (connected)">
            <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-xs">
              {address ?? "—"}
            </code>
          </DetailRow>
          <DetailRow label="Smart Wallet">
            <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-xs">
              {u.smartWallet ?? "—"}
            </code>
          </DetailRow>
          <DetailRow label="Chains">
            {u.chains?.map(formatChainName).join(", ") || "None"}
          </DetailRow>
          <DetailRow label="Strategy">
            {u.strategy || "Default"}
          </DetailRow>
          <DetailRow label="Session Key Active">
            {u.hasActiveSessionKey ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Auto Select Protocols">
            {u.autoSelectProtocols ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Omni-Account">
            {u.omniAccount ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Cross-chain">
            {u.crosschainStrategy ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Splitting">
            {u.splitting ? `Yes (Min: ${u.minSplits || "N/A"})` : "No"}
          </DetailRow>
          <DetailRow label="Protocols">
            {u.protocols?.length || 0}
            {protocolLabels.length > 0 && (
              <span className="ml-2 text-xs opacity-70">
                ({protocolLabels.join(", ")})
              </span>
            )}
          </DetailRow>
          {u.agentName && (
            <DetailRow label="Agent Name">{u.agentName}</DetailRow>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-500">
          Fetch user details to view profile.
        </p>
      )}
    </Panel>
  );
}
