import type { ReactNode } from "react";

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{children}</span>
    </div>
  );
}
