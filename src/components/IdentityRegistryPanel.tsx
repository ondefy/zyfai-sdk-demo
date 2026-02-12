import { useState } from "react";
import type { RegisterAgentResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow, Callout } from "./ui";
import { truncate, getExplorerUrl, formatChainName } from "../utils/formatters";

export function IdentityRegistryPanel() {
  const {
    sdk,
    address,
    isBusy,
    selectedChain,
    setStatus,
    setIsBusy,
    walletInfo,
    ensureWallet,
  } = useSdk();

  const [result, setResult] = useState<RegisterAgentResponse | null>(null);

  const register = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Resolve smart wallet first.");
      return;
    }
    if (selectedChain !== 8453 && selectedChain !== 42161) {
      setStatus("Identity Registry only supports Base and Arbitrum.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus(`Registering on Identity Registry (chain ${selectedChain})…`);
      const res = await sdk!.registerAgentOnIdentityRegistry(
        walletInfo.address,
        selectedChain
      );
      setResult(res);
      setStatus(
        res.success
          ? `Registered! Tx: ${truncate(res.txHash, 10)}`
          : "Registration failed."
      );
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const supported = selectedChain === 8453 || selectedChain === 42161;

  return (
    <Panel
      title="Identity Registry"
      description="Register your agent on-chain. Supported: Base (8453) and Arbitrum (42161)."
    >
      <Btn
        onClick={register}
        disabled={isBusy || !address || !walletInfo?.address || !supported}
      >
        Register Agent
      </Btn>

      {!walletInfo?.address && (
        <p className="mt-3 text-sm italic text-slate-500">
          Resolve your Smart Wallet first.
        </p>
      )}

      {walletInfo?.address && !supported && (
        <p className="mt-3 text-sm italic text-slate-500">
          Switch to Base or Arbitrum to use the Identity Registry.
        </p>
      )}

      {result && (
        <Callout>
          <strong>Registration</strong>
          <div className="mt-2 flex flex-col gap-2">
            <DetailRow label="Status">
              <span className={result.success ? "text-green-400" : "text-red-400"}>
                {result.success ? "Success" : "Failed"}
              </span>
            </DetailRow>
            <DetailRow label="Tx">
              <a
                href={getExplorerUrl(result.chainId, result.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-primary-light hover:underline"
              >
                {truncate(result.txHash, 10)}
              </a>
            </DetailRow>
            <DetailRow label="Chain">{formatChainName(result.chainId)}</DetailRow>
            <DetailRow label="Smart Wallet">
              <code className="text-xs">{truncate(result.smartWallet, 10)}</code>
            </DetailRow>
          </div>
        </Callout>
      )}
    </Panel>
  );
}
