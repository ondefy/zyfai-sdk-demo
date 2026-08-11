import { useState } from "react";
import type { DepositResponse, Strategy, WithdrawResponse } from "@zyfai/sdk";
import { useSdk } from "../context/SdkContext";
import { Btn, Panel, Callout, Select } from "./ui";
import { truncate, getExplorerUrl } from "../utils/formatters";

/** Symbols accepted by depositFunds / withdrawFunds. */
type DepositWithdrawAsset = "USDC" | "WETH" | "EURC";

const ASSET_OPTIONS: { value: DepositWithdrawAsset; label: string }[] = [
  { value: "USDC", label: "USDC (6 decimals)" },
  { value: "WETH", label: "WETH (18 decimals)" },
  { value: "EURC", label: "EURC (6 decimals · Mainnet & Base)" },
];

const STRATEGY_OPTIONS: { value: Strategy; label: string }[] = [
  { value: "conservative", label: "conservative (default)" },
  { value: "aggressive", label: "aggressive" },
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
    setWalletInfo,
  } = useSdk();

  const [depositAsset, setDepositAsset] = useState<DepositWithdrawAsset>("USDC");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositStrategy, setDepositStrategy] =
    useState<Strategy>("conservative");
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
        depositAsset,
        depositStrategy
      );
      setDepositOutcome({ res, asset: depositAsset });
      if (res.smartWallet) {
        setWalletInfo({
          address: res.smartWallet,
          isDeployed: true,
        });
      }
      setStatus(
        res.success
          ? `Deposit confirmed. Safe: ${truncate(res.smartWallet, 10)} · Tx: ${truncate(res.txHash, 10)}`
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
      description="Transfer tokens from your EOA to your Zyfai Smart Wallet via depositFunds. Withdrawals return funds to your EOA and may be asynchronous."
    >
      {/* ---------- Deposit ---------- */}
      <div className="mb-6">
        <h3 className="mb-2 text-base font-semibold text-white">Deposit</h3>

        <Callout>
          <strong>How onboarding works now</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>
              The <strong>first</strong> <code className="text-xs">depositFunds</code> assigns
              a pre-deployed Safe (with a signed session key) to your EOA. No separate{" "}
              <code className="text-xs">deploySafe</code> or{" "}
              <code className="text-xs">createSessionKey</code> call.
            </li>
            <li>
              That Safe is live on <strong>Base</strong>, <strong>Arbitrum</strong>, and{" "}
              <strong>Ethereum Mainnet</strong> at once — not only on the chain you deposit on.
              You remain the Safe owner; your EOA stays a normal wallet.
            </li>
            <li>
              Optional <strong>strategy</strong> (<code className="text-xs">conservative</code> /{" "}
              <code className="text-xs">aggressive</code>) applies on first deposit only (protocol
              patching). Later deposits ignore it for that step.
            </li>
            <li>
              Assets: <strong>USDC</strong> / <strong>EURC</strong> (6 decimals),{" "}
              <strong>WETH</strong> (18). Deposit <strong>WETH</strong>, not native ETH — wrap
              first if needed. EURC is Mainnet + Base only.
            </li>
            <li>
              Minimums apply to total Safe balance after deposit (Base/Arbitrum: ~$5 USDC / 0.001
              WETH / €5 EURC on Base; Mainnet: higher thresholds). Top-ups below the min are OK if
              the Safe already meets it.
            </li>
          </ul>
        </Callout>

        <label className="mb-3 mt-4 flex max-w-xs flex-col gap-1 text-sm text-slate-400">
          Asset
          <Select
            value={depositAsset}
            onChange={(e) =>
              setDepositAsset(e.target.value as DepositWithdrawAsset)
            }
          >
            {ASSET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="mb-3 flex max-w-xs flex-col gap-1 text-sm text-slate-400">
          First-deposit strategy
          <Select
            value={depositStrategy}
            onChange={(e) => setDepositStrategy(e.target.value as Strategy)}
          >
            {STRATEGY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Amount (least decimals)
          <input
            type="text"
            placeholder="e.g. 100000000 = 100 USDC/EURC · 1e18 = 1 WETH"
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
              Amount: {depositOutcome.res.amount} · Smart Wallet:{" "}
              <code className="text-xs break-all">{depositOutcome.res.smartWallet}</code>
              {" · "}
              Tx:{" "}
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
          <Select
            value={withdrawAsset}
            onChange={(e) =>
              setWithdrawAsset(e.target.value as DepositWithdrawAsset)
            }
          >
            {ASSET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
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
