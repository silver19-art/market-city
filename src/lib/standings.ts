/** Turning everyone's returns into a percentile and a smooth distribution for the results screen. */

export interface Bin {
  x0: number;
  x1: number;
  count: number;
}

export interface Standing {
  /** Share of other players you beat (0 to 1), or null if you're the only one so far. */
  percentile: number | null;
  /** Players counted, including you. */
  total: number;
  bins: Bin[];
  you: number;
}

/** Share of the other players whose return is below yours. Ties count as half. */
export function percentileOf(you: number, others: number[]): number | null {
  if (others.length === 0) return null;
  let below = 0;
  for (const r of others) below += r < you ? 1 : r === you ? 0.5 : 0;
  return below / others.length;
}

/**
 * Histogram over the middle of the distribution (2nd to 98th percentile, widened to include you),
 * so one wild outlier doesn't squash everyone else into a single bar.
 */
export function histogram(all: number[], you: number, count = 24): Bin[] {
  if (all.length === 0) return [];
  const sorted = [...all].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
  let lo = Math.min(q(0.02), you);
  let hi = Math.max(q(0.98), you);
  if (hi - lo < 0.02) {
    lo -= 0.05;
    hi += 0.05;
  }
  const pad = (hi - lo) * 0.06;
  lo -= pad;
  hi += pad;
  const w = (hi - lo) / count;
  const bins: Bin[] = Array.from({ length: count }, (_, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, count: 0 }));
  for (const r of sorted) bins[Math.min(count - 1, Math.max(0, Math.floor((r - lo) / w)))].count++;
  return bins;
}

/** Where `you` sits among everyone else's scores (others must not include this player). */
export function standingFrom(you: number, others: number[]): Standing {
  return { percentile: percentileOf(you, others), total: others.length + 1, bins: histogram([...others, you], you), you };
}
