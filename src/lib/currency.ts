/**
 * World eras are played as an American investor: every foreign price is converted to US dollars
 * with that month's exchange rate, so currency moves count, just as they would for real.
 */
export type Currency = "USD" | "EUR" | "CHF" | "JPY" | "CNY" | "HKD" | "GBP";

const SUFFIX: Record<string, Currency> = {
  DE: "EUR",
  PA: "EUR",
  MC: "EUR",
  MI: "EUR",
  AS: "EUR",
  SW: "CHF",
  T: "JPY",
  SS: "CNY",
  SZ: "CNY",
  HK: "HKD",
  L: "GBP",
};

export function currencyOf(ticker: string): Currency {
  const dot = ticker.lastIndexOf(".");
  return dot < 0 ? "USD" : (SUFFIX[ticker.slice(dot + 1)] ?? "USD");
}

/** Yahoo symbol for the exchange rate, and whether it's quoted as dollars per unit (true) or units per dollar. */
export function fxSymbol(c: Exclude<Currency, "USD">): { symbol: string; usdPerUnit: boolean } {
  if (c === "EUR" || c === "GBP") return { symbol: `${c}USD=X`, usdPerUnit: true };
  return { symbol: `${c}=X`, usdPerUnit: false };
}

/** Multiply a local-currency price series by the dollar value of one unit, month by month. */
export function toUsd(prices: (number | null)[], fx: (number | null)[], usdPerUnit: boolean): (number | null)[] {
  let lastRate: number | null = null;
  return prices.map((p, i) => {
    const r = fx[i];
    if (r != null && r > 0) lastRate = usdPerUnit ? r : 1 / r;
    return p == null || lastRate == null ? null : p * lastRate;
  });
}

/** Ticker without its exchange suffix, for labels ("SAP.DE" becomes "SAP"). */
export const displayTicker = (t: string) => (t.includes(".") ? t.slice(0, t.lastIndexOf(".")) : t);

/** What to print on a tower or chip: the ticker without its suffix, or the name for number-only codes like 7203.T. */
export const shortLabel = (ticker: string, name: string) => {
  const base = displayTicker(ticker);
  return /^\d+$/.test(base) ? name.replace(/\s*\(.*\)$/, "") : base;
};
