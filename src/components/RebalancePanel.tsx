import { useState } from "react";
import type { RebalanceFrequencyResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";

export function RebalancePanel() {
  const { sdk, isBusy, setStatus, setIsBusy, walletInfo, ensureWallet } = useSdk();
  const [data, setData] = useState<RebalanceFrequencyResponse | null>(null);

  const fetch = async () => {
    if (!ensureWallet() || !walletInfo?.address) {
      setStatus("Resolve smart wallet first.");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Fetching rebalance frequency…");
      const res = await sdk!.getRebalanceFrequency(walletInfo.address);
      setData(res);
      setStatus(`Tier: ${res.tier}, Frequency: ${res.frequency}/day`);
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel title="Rebalance" description="Get rebalance frequency tier for your wallet.">
      <Btn onClick={fetch} disabled={isBusy || !walletInfo?.address}>
        Get Rebalance Frequency
      </Btn>
      {data && (
        <div className="mt-4 flex flex-col gap-2">
          <DetailRow label="Tier">{data.tier}</DetailRow>
          <DetailRow label="Frequency">{data.frequency}/day</DetailRow>
          {data.description && (
            <DetailRow label="Description">{data.description}</DetailRow>
          )}
        </div>
      )}
    </Panel>
  );
}
