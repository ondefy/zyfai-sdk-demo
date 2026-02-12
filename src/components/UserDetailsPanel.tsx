import { useSdk } from "../context/SdkContext";
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
    ensureWallet,
  } = useSdk();

  const fetchUserDetails = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Fetching user details…");
      const res = await sdk!.getUserDetails();
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
      await sdk!.updateUserProfile({ strategy: s });
      const res = await sdk!.getUserDetails();
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
      const res = await sdk!.getUserDetails();
      setUserDetails(res);
      setStatus("Agent paused. All protocols cleared.");
    } catch (e) {
      setStatus(`Failed to pause agent: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const user = userDetails?.user;

  return (
    <Panel
      title="User Details"
      description="View and manage your profile, strategy, and agent settings."
    >
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
      </div>

      {user ? (
        <div className="mt-4 flex flex-col gap-3">
          <DetailRow label="Address">
            <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-xs">
              {user.address}
            </code>
          </DetailRow>
          <DetailRow label="Smart Wallet">
            <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-xs">
              {user.smartWallet}
            </code>
          </DetailRow>
          <DetailRow label="Chains">
            {user.chains?.map(formatChainName).join(", ") || "None"}
          </DetailRow>
          <DetailRow label="Strategy">
            {user.strategy || "Default"}
          </DetailRow>
          <DetailRow label="Session Key Active">
            {user.hasActiveSessionKey ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Auto Select Protocols">
            {user.autoSelectProtocols ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Omni-Account">
            {user.omniAccount ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Cross-chain">
            {user.crosschainStrategy ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Splitting">
            {user.splitting ? `Yes (Min: ${user.minSplits || "N/A"})` : "No"}
          </DetailRow>
          <DetailRow label="Protocols">
            {user.protocols?.length || 0}
            {user.protocols?.length > 0 && (
              <span className="ml-2 text-xs opacity-70">
                ({user.protocols.map((p) => p.name).join(", ")})
              </span>
            )}
          </DetailRow>
          {user.agentName && (
            <DetailRow label="Agent Name">{user.agentName}</DetailRow>
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
