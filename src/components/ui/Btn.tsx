import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "danger" | "success";

const variants: Record<Variant, string> = {
  default:
    "bg-dark-600 text-slate-100 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed",
  primary:
    "bg-primary text-dark-950 hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed",
  success:
    "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed",
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
