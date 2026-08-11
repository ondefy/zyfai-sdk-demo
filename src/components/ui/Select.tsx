import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

/** Native <select> with an inset chevron (avoids unreliable bg-image on selects). */
export function Select({ className = "", ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        className={`w-full appearance-none rounded-lg border border-dark-500 bg-dark-700 py-2 pl-3 pr-10 text-sm text-white ${className}`}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] leading-none text-slate-400"
      >
        ▼
      </span>
    </div>
  );
}
