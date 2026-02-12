import { useSdk } from "../context/SdkContext";

export function StatusBar() {
  const { status } = useSdk();

  return (
    <div className="rounded-xl border border-dark-600 bg-dark-900/80 px-4 py-3 text-sm">
      <strong className="text-slate-300">Status:</strong>{" "}
      <span className="text-slate-400">{status}</span>
    </div>
  );
}
