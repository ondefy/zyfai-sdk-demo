import type { DailyApyEntry } from "@zyfai/sdk";

/** Sum string amounts from a token → amount map (API returns numeric strings). */
export const sumTokenAmountStrings = (
  m: Record<string, string> | undefined
): number => {
  if (!m) return 0;
  return Object.values(m).reduce(
    (acc, v) => acc + parseFloat(v || "0"),
    0
  );
};

/** Average of numeric values in a token → number map (e.g. APY by asset). */
export const averageTokenNumbers = (
  m: Record<string, number> | undefined
): number | null => {
  if (!m) return null;
  const vals = Object.values(m).filter((v) => typeof v === "number");
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

/** Blend per-token APY maps from a daily history row into one display value. */
export const blendedApyFromDailyEntry = (entry: DailyApyEntry): number => {
  const m =
    entry.final_weighted_apy ??
    entry.weighted_apy_after_fee ??
    entry.weighted_apy;
  if (!m || typeof m !== "object") return 0;
  const vals = Object.values(m).filter((x): x is number => typeof x === "number");
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};
