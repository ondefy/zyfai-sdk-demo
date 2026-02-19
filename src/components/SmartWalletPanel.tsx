import { useState } from "react";
import type { DeploySafeResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow, Callout } from "./ui";
import { truncate, getExplorerUrl } from "../utils/formatters";

export function SmartWalletPanel() {
  const {
    sdk,
    address,
    isBusy,
    selectedChain,
    setStatus,
    setIsBusy,
    walletInfo,
    setWalletInfo,
    ensureWallet,
  } = useSdk();

  const [deployResult, setDeployResult] = useState<DeploySafeResponse | null>(
    null
  );

  const resolveSmartWallet = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Resolving deterministic Safe address…");
      const res = await sdk!.getSmartWalletAddress(address!, selectedChain);
      setWalletInfo(res);
      setStatus(
        res.isDeployed
          ? `Safe already deployed at ${res.address}`
          : "Safe not deployed yet. Deterministic address ready."
      );
    } catch (e) {
      setStatus(`Failed to resolve Safe: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const deploySafe = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Deploying Safe smart wallet…");
      const res = await sdk!.deploySafe(address!, selectedChain, "aggressive");
      console.log("deploySafe res", res);
      setDeployResult(res);
      setStatus(
        res.success
          ? `Safe deployed at ${res.safeAddress}`
          : "Safe deployment reported a failure."
      );
      const refreshed = await sdk!.getSmartWalletAddress(
        address!,
        selectedChain
      );
      setWalletInfo(refreshed);
    } catch (e) {
      setStatus(`Failed to deploy Safe: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel
      title="Smart Wallet"
      description="Resolve the deterministic Safe address for this user and deploy it if necessary."
    >
      <div className="flex flex-wrap gap-3">
        <Btn onClick={resolveSmartWallet} disabled={isBusy || !address}>
          Resolve Smart Wallet
        </Btn>
        <Btn onClick={deploySafe} disabled={isBusy || !address}>
          Deploy Safe
        </Btn>
      </div>

      {walletInfo ? (
        <div className="mt-4 flex flex-col gap-3">
          <DetailRow label="Safe Address">
            <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-xs break-all">
              {walletInfo.address}
            </code>
          </DetailRow>
          <DetailRow label="Deployed?">
            {walletInfo.isDeployed ? "Yes" : "No"}
          </DetailRow>
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-500">
          Resolve to view the deterministic Safe address.
        </p>
      )}

      {deployResult && (
        <Callout>
          <strong>Last Deployment</strong>
          <p className="mt-1">
            Status: {deployResult.status} · Tx:{" "}
            <a
              href={getExplorerUrl(selectedChain, deployResult.txHash)}
              target="_blank"
              rel="noreferrer"
              className="text-primary-light hover:underline"
            >
              {truncate(deployResult.txHash, 10)}
            </a>
          </p>
        </Callout>
      )}
    </Panel>
  );
}
