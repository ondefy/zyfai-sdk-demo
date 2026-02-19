import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "danger" | "success";

const variants: Record<Variant, string> = {
  default:
    "bg-[#1a242d] text-[#E7EAED] border border-[#2a3640] hover:bg-[#243038] hover:border-[#3a4a58] disabled:opacity-50 disabled:cursor-not-allowed",
  primary:
    "bg-[#4499E1] text-white hover:bg-[#5aacf0] disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-red-600/90 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed",
  success:
    "bg-emerald-600/90 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Btn({ variant = "default", className = "", ...props }: BtnProps) {
  return (
    <button
      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
