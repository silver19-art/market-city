/** Parse free monthly price history into one value per month of an era. */

export type Series = (number | null)[];

/** "YYYY-MM" for a Unix timestamp (seconds). Monthly bars are stamped at the start of the month. */
export function monthKey(ts: number): string {
  const d = new Date(ts * 1000 + 12 * 3600 * 1000); // nudge past time-zone edges
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Yahoo Finance v8 chart JSON → adjusted close per month (split- and dividend-adjusted). */
export function parseYahooChart(json: unknown, months: string[]): Series | null {
  const res = (json as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as
    | { timestamp?: number[]; indicators?: { adjclose?: { adjclose?: (number | null)[] }[]; quote?: { close?: (number | null)[] }[] } }
    | undefined;
  if (!res?.timestamp?.length) return null;
  const vals = res.indicators?.adjclose?.[0]?.adjclose ?? res.indicators?.quote?.[0]?.close;
  if (!vals) return null;
  const byMonth = new Map<string, number>();
  res.timestamp.forEach((ts, i) => {
    const v = vals[i];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) byMonth.set(monthKey(ts), v);
  });
  const out = months.map((m) => byMonth.get(m) ?? null);
  return out.some((v) => v !== null) ? out : null;
}

/** Stooq monthly CSV (Date,Open,High,Low,Close,Volume) → close per month. Split-adjusted. */
export function parseStooqCsv(csv: string, months: string[]): Series | null {
  const lines = csv.trim().split(/\r?\n/);
  if (!/^date,/i.test(lines[0] ?? "")) return null;
  const byMonth = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const [date, , , , close] = line.split(",");
    const v = Number(close);
    if (date && Number.isFinite(v) && v > 0) byMonth.set(date.slice(0, 7), v);
  }
  const out = months.map((m) => byMonth.get(m) ?? null);
  return out.some((v) => v !== null) ? out : null;
}

/** Round to 4 significant-ish decimals to keep payloads small. */
export const compact = (s: Series): Series => s.map((v) => (v === null ? null : Math.round(v * 10000) / 10000));
