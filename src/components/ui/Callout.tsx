import type { ReactNode } from "react";

interface CalloutProps {
  children: ReactNode;
}

export function Callout({ children }: CalloutProps) {
  return (
    <div className="mt-4 rounded-xl border-l-3 border-primary bg-primary/5 p-4 text-sm">
      {children}
    </div>
  );
}
