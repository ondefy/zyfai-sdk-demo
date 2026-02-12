import { useSdk } from "../context/SdkContext";
import { Btn } from "./ui";

export function Header() {
  const { address, isConnected, openModal, disconnectWallet } = useSdk();

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-2xl font-bold text-white">
          Zyfai SDK + Reown AppKit
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect an EOA via Reown, then use the SDK to manage DeFi positions.
        </p>
      </div>

      <div className="flex gap-3">
        <Btn variant="primary" onClick={openModal}>
          {isConnected ? "Switch Wallet" : "Connect Wallet"}
        </Btn>
        {isConnected && (
          <Btn
            className="border border-dark-500 bg-transparent"
            onClick={disconnectWallet}
          >
            Disconnect
          </Btn>
        )}
      </div>

      {address && (
        <div className="w-full text-xs text-slate-500">
          Connected:{" "}
          <code className="rounded bg-dark-800 px-1.5 py-0.5 font-mono text-slate-300">
            {address.slice(0, 6)}…{address.slice(-4)}
          </code>
        </div>
      )}
    </header>
  );
}
