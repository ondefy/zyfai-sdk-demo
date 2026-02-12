import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  children?: ReactNode;
}

export function StatCard({ label, value, children }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dark-600 bg-dark-900 p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-2xl font-bold text-primary">{value}</span>
      {children}
    </div>
  );
}
