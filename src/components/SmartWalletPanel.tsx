import { useSdk } from "../context/SdkContext";
import { Btn, Panel, DetailRow } from "./ui";

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

  const resolveSmartWallet = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      setStatus("Looking up Smart Wallet for this EOA…");
      const res = await sdk!.getSmartWalletAddress(address!, selectedChain);
      setWalletInfo(res);
      setStatus(
        res.isDeployed
          ? `Smart Wallet at ${res.address}`
          : "No Smart Wallet assigned yet. Deposit funds to onboard (pre-deployed Safe + session)."
      );
    } catch (e) {
      setStatus(`Failed to resolve Safe: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel
      title="Smart Wallet"
      description="Look up the Safe linked to this EOA. On first depositFunds, Zyfai assigns a pre-deployed Safe (with session key) on Base, Arbitrum, and Ethereum Mainnet — no separate deploy step."
    >
      <div className="flex flex-wrap gap-3">
        <Btn onClick={resolveSmartWallet} disabled={isBusy || !address}>
          Resolve Smart Wallet
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
            {walletInfo.isOwner ? "Yes" : "No"}
          </DetailRow>
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-slate-500">
          Resolve to view the Safe address for this EOA (assigned after first deposit).
        </p>
      )}
    </Panel>
  );
}
