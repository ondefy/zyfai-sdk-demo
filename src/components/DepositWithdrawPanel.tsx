import { useState } from "react";
import type { DepositResponse, WithdrawResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, Callout } from "./ui";
import { truncate, getExplorerUrl } from "../utils/formatters";

export function DepositWithdrawPanel() {
  const { sdk, address, isBusy, selectedChain, setStatus, setIsBusy, ensureWallet } =
    useSdk();

  const [depositAmount, setDepositAmount] = useState("");
  const [depositResult, setDepositResult] = useState<DepositResponse | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(null);

  const executeDeposit = async () => {
    if (!ensureWallet()) return;
    if (!depositAmount || depositAmount === "0") {
      setStatus("Please enter a valid deposit amount (in least decimal units).");
      return;
    }
    try {
      setIsBusy(true);
      setStatus("Depositing funds to Zyfai…");
      const res = await sdk!.depositFunds(address!, selectedChain, depositAmount);
      setDepositResult(res);
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
          ? "Withdrawing all funds from Zyfai…"
          : `Withdrawing ${withdrawAmount} from Zyfai…`
      );
      const res = await sdk!.withdrawFunds(
        address!,
        selectedChain,
        withdrawAmount || undefined
      );
      setWithdrawResult(res);
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
      description="Transfer tokens into your Zyfai smart wallet or withdraw them back. Amounts are in least decimal units (e.g. 1 USDC = 1000000)."
    >
      {/* ---------- Deposit ---------- */}
      <div className="mb-6">
        <h3 className="mb-2 text-base font-semibold text-white">Deposit</h3>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount (least decimals)
          <input
            type="text"
            placeholder="e.g. 1000000 for 1 USDC"
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
        {depositResult && (
          <Callout>
            <strong>Last Deposit</strong>
            <p className="mt-1">
              Amount: {depositResult.amount} · Tx:{" "}
              <a
                href={getExplorerUrl(selectedChain, depositResult.txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-primary-light hover:underline"
              >
                {truncate(depositResult.txHash, 10)}
              </a>
            </p>
          </Callout>
        )}
      </div>

      {/* ---------- Withdraw ---------- */}
      <div>
        <h3 className="mb-2 text-base font-semibold text-white">Withdraw</h3>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount (optional, leave empty for full withdrawal)
          <input
            type="text"
            placeholder="Empty = full withdrawal"
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
        {withdrawResult && (
          <Callout>
            <strong>Last Withdraw</strong>
            <p className="mt-1">
              Type: {withdrawResult.type} · Amount: {withdrawResult.amount}
            </p>
          </Callout>
        )}
      </div>
    </Panel>
  );
}
