/**
 * Kenneth French's data library (Dartmouth): free monthly returns back to 1926.
 * We use the 30 industry portfolios (value-weighted, dividends included) for eras before
 * stock-by-stock data exists, and the market factor (Mkt-RF + RF) as the benchmark.
 */
import type { Series } from "./history";

export const FRENCH_BASE = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/";
export const INDUSTRIES_FILE = "30_Industry_Portfolios_CSV.zip";
export const FACTORS_FILE = "F-F_Research_Data_Factors_CSV.zip";

/** Monthly returns (as fractions) from the first table in a French CSV, keyed by column then YYYY-MM. */
export function parseFrenchMonthly(csv: string): Record<string, Map<string, number>> {
  const lines = csv.split(/\r?\n/);
  const headerAt = lines.findIndex((l) => /^\s*,/.test(l) && l.split(",").length > 2);
  if (headerAt < 0) return {};
  const cols = lines[headerAt].split(",").map((c) => c.trim());
  const out: Record<string, Map<string, number>> = {};
  for (const c of cols.slice(1)) if (c) out[c] = new Map();
  for (const line of lines.slice(headerAt + 1)) {
    const cells = line.split(",").map((c) => c.trim());
    if (!/^\d{6}$/.test(cells[0] ?? "")) break; // the monthly table ends at the first blank or annual row
    const ym = `${cells[0].slice(0, 4)}-${cells[0].slice(4)}`;
    cols.slice(1).forEach((c, i) => {
      const v = Number(cells[i + 1]);
      if (c && Number.isFinite(v) && v > -99) out[c].set(ym, v / 100);
    });
  }
  return out;
}

/** Turn monthly returns into a price-like index that starts at 100 in the first month. */
export function toIndex(returns: Map<string, number>, months: string[]): Series | null {
  const out: Series = [];
  let level: number | null = null;
  for (const m of months) {
    const r = returns.get(m);
    if (r === undefined) {
      out.push(level);
      continue;
    }
    level = level === null ? 100 : level * (1 + r);
    out.push(level);
  }
  return out.some((v) => v !== null) ? out : null;
}

/** Total US market return per month: the market's excess return plus the risk-free rate. */
export function marketReturns(factors: Record<string, Map<string, number>>): Map<string, number> {
  const mkt = factors["Mkt-RF"];
  const rf = factors["RF"];
  const out = new Map<string, number>();
  if (!mkt || !rf) return out;
  for (const [m, v] of mkt) out.set(m, v + (rf.get(m) ?? 0));
  return out;
}
