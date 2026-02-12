import { useState } from "react";
import type { SessionKeyResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";
import { truncate } from "../utils/formatters";

export function SessionKeyPanel() {
  const {
    sdk,
    address,
    isBusy,
    selectedChain,
    setStatus,
    setIsBusy,
    userDetails,
    ensureWallet,
    refreshUserDetails,
  } = useSdk();

  const [sessionInfo, setSessionInfo] = useState<SessionKeyResponse | null>(
    null
  );

  const createSessionKey = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Creating + activating session key…");
      const res = await sdk!.createSessionKey(address!, selectedChain);
      console.log("res", res);
      setSessionInfo(res);
      setStatus("Session key registered with Zyfai API.");
      await refreshUserDetails();
    } catch (e) {
      setStatus(`Failed to create session key: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel
      title="Session Key"
      description="Create a session key to authorize the Zyfai engine to rebalance positions on your behalf."
    >
      <div className="flex flex-wrap gap-3">
        <Btn onClick={createSessionKey} disabled={isBusy || !address}>
          Create Session Key
        </Btn>
      </div>

      {sessionInfo ? (
        <div className="mt-4 flex flex-col gap-3">
          <DetailRow label="User ID">
            {sessionInfo.userId ?? "n/a"}
          </DetailRow>
          <DetailRow label="Signature">
            <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-xs break-all">
              {truncate(sessionInfo.signature, 14)}
            </code>
          </DetailRow>
          <DetailRow label="Activation">
            {sessionInfo.sessionActivation?.isActive ||
            userDetails?.user?.hasActiveSessionKey
              ? "Active"
              : "Pending"}
          </DetailRow>
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-500">
          Generate a session to view its metadata.
        </p>
      )}
    </Panel>
  );
}
