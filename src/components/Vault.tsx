import { useSdk } from "../context/SdkContext";
import { Btn } from "./ui";

export function Vault() {
  const {
    sdk,
    isBusy,
    ensureSdk,
  } = useSdk();

  const depositVault = async () => {
    if (!ensureSdk()) return;
    try {
      const res = await sdk!.vaultDeposit("2.1", "USDC");
      console.log("res", res);
    } catch (e) {
      console.error("error", e);
    } 
  };

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-dark-600 bg-dark-900/80 p-4">
      <div className="flex gap-3">
        <Btn onClick={depositVault} disabled={isBusy}>
          Vault Deposit
        </Btn>
      </div>
    </div>
  );
}
