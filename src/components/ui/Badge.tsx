interface BadgeProps {
  children: React.ReactNode;
  color?: "green" | "yellow" | "red" | "purple" | "slate";
}

const colors = {
  green: "bg-green-500/20 text-green-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
  red: "bg-red-500/20 text-red-400",
  purple: "bg-primary/20 text-primary-light",
  slate: "bg-slate-500/20 text-slate-400",
};

export function Badge({ children, color = "purple" }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${colors[color]}`}
    >
      {children}
    </span>
  );
}
