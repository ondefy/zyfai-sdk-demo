import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function Panel({ title, description, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-dark-600 bg-dark-900/80 p-6">
      <h2 className="mt-0 mb-1 text-xl font-bold text-white">{title}</h2>
      {description && (
        <p className="mb-4 text-sm text-slate-400">{description}</p>
      )}
      {children}
    </section>
  );
}
