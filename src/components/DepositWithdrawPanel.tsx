import { useState } from "react";
import type { DepositResponse, WithdrawResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, Callout } from "./ui";
import { truncate, getExplorerUrl, formatChainName } from "../utils/formatters";

/** Symbols accepted by depositFunds (4th arg) and withdrawFunds (tokenSymbol). */
type DepositWithdrawAsset = "USDC" | "WETH";

const ASSET_OPTIONS: { value: DepositWithdrawAsset; label: string }[] = [
  { value: "USDC", label: "USDC" },
  { value: "WETH", label: "WETH" },
];

export function DepositWithdrawPanel() {
  const {
    sdk,
    address,
    isBusy,
    selectedChain,
    setStatus,
    setIsBusy,
    ensureWallet,
  } = useSdk();

  const [depositAsset, setDepositAsset] = useState<DepositWithdrawAsset>("USDC");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositOutcome, setDepositOutcome] = useState<{
    res: DepositResponse;
    asset: DepositWithdrawAsset;
  } | null>(null);
  const [withdrawAsset, setWithdrawAsset] = useState<DepositWithdrawAsset>("USDC");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawOutcome, setWithdrawOutcome] = useState<{
    res: WithdrawResponse;
    asset: DepositWithdrawAsset;
  } | null>(null);

  const executeDeposit = async () => {
    if (!ensureWallet()) return;
    if (!depositAmount || depositAmount === "0") {
      setStatus("Please enter a valid deposit amount (in least decimal units).");
      return;
    }
    try {
      setIsBusy(true);
      setStatus(`Depositing ${depositAsset} to Zyfai…`);
      const res = await sdk!.depositFunds(
        address!,
        selectedChain,
        depositAmount,
        depositAsset
      );
      setDepositOutcome({ res, asset: depositAsset });
      setStatus(
        res.success
          ? `Deposit submitted. Tx: ${truncate(res.txHash, 10)}`
          : "Deposit reported a failure."
      );
    } catch (e) {
      setStatus(`Failed to deposit: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const executeWithdraw = async () => {
    if (!ensureWallet()) return;
    try {
      setIsBusy(true);
      const isFullWithdraw = !withdrawAmount || withdrawAmount === "0";
      setStatus(
        isFullWithdraw
          ? `Withdrawing all ${withdrawAsset} from Zyfai…`
          : `Withdrawing ${withdrawAmount} (${withdrawAsset}) from Zyfai…`
      );

      const res = await sdk!.withdrawFunds(
        address!,
        selectedChain,
        withdrawAmount || undefined,
        withdrawAsset
      );

      setWithdrawOutcome({ res, asset: withdrawAsset });
      setStatus(res.success ? "Withdraw submitted." : "Withdraw reported a failure.");
    } catch (e) {
      setStatus(`Failed to withdraw: ${(e as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Panel
      title="Deposit & Withdraw"
      description={`Choose USDC or WETH and pass it to the SDK: depositFunds(userAddress, chainId, amount, asset?) and withdrawFunds(userAddress, chainId, amount?, tokenSymbol?). Without asset, the SDK still defaults by chain (e.g. USDC on ${formatChainName(8453)} / ${formatChainName(42161)}, USDT on ${formatChainName(9745)}). Amounts are least decimal units (USDC: 6 decimals; WETH: 18). Withdrawals go to your EOA and may be asynchronous.`}
    >
      {/* ---------- Deposit ---------- */}
      <div className="mb-6">
        <h3 className="mb-2 text-base font-semibold text-white">Deposit</h3>
        <label className="mb-3 flex max-w-xs flex-col gap-1 text-sm text-slate-400">
          Asset
          <select
            value={depositAsset}
            onChange={(e) =>
              setDepositAsset(e.target.value as DepositWithdrawAsset)
            }
            className="rounded-lg border border-dark-500 bg-dark-700 py-2 pl-3 pr-10 text-sm text-white"
          >
            {ASSET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount (least decimals)
          <input
            type="text"
            placeholder="USDC: 1000000 = 1 USDC · WETH: 1e18 wei = 1 WETH"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:border-primary focus:outline-none"
          />
        </label>
        <div className="mt-3 flex gap-3">
          <Btn onClick={executeDeposit} disabled={isBusy || !address || !depositAmount}>
            Execute Deposit
          </Btn>
        </div>
        {depositOutcome && (
          <Callout>
            <strong>Last Deposit ({depositOutcome.asset})</strong>
            <p className="mt-1">
              Amount: {depositOutcome.res.amount} · Tx:{" "}
              <a
                href={getExplorerUrl(selectedChain, depositOutcome.res.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-primary-light hover:underline"
              >
                {truncate(depositOutcome.res.txHash, 10)}
              </a>
            </p>
          </Callout>
        )}
      </div>

      {/* ---------- Withdraw ---------- */}
      <div>
        <h3 className="mb-2 text-base font-semibold text-white">Withdraw</h3>
        <label className="mb-3 flex max-w-xs flex-col gap-1 text-sm text-slate-400">
          Asset (tokenSymbol)
          <select
            value={withdrawAsset}
            onChange={(e) =>
              setWithdrawAsset(e.target.value as DepositWithdrawAsset)
            }
            className="rounded-lg border border-dark-500 bg-dark-700 py-2 pl-3 pr-10 text-sm text-white"
          >
            {ASSET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount (optional, leave empty for full withdrawal of this asset)
          <input
            type="text"
            placeholder="Empty = full withdrawal for selected asset"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder:text-dark-400 focus:border-primary focus:outline-none"
          />
        </label>
        <div className="mt-3 flex gap-3">
          <Btn onClick={executeWithdraw} disabled={isBusy || !address}>
            Execute Withdraw
          </Btn>
        </div>
        {withdrawOutcome && (
          <Callout>
            <strong>Last Withdraw ({withdrawOutcome.asset})</strong>
            <p className="mt-1">
              Type: {withdrawOutcome.res.type} · Amount:{" "}
              {withdrawOutcome.res.amount}
            </p>
          </Callout>
        )}
      </div>
    </Panel>
  );
}
