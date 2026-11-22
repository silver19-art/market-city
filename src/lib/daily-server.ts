import "server-only";
import { cacheLife } from "next/cache";
import { buildPuzzle, pickPuzzle } from "./daily";
import { monthsBetween } from "./eras";
import { FACTORS_FILE, INDUSTRIES_FILE, marketReturns, toIndex } from "./french";
import type { Series } from "./history";
import { french, fromYahoo } from "./load-era";
import { simulateReturns } from "./simulate";

const seedFor = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The day's 24 months of data: industries or companies, plus the whole US market as the benchmark. */
async function windowData(day: string) {
  "use cache";
  cacheLife("max");
  const pick = pickPuzzle(day);
  const months = monthsBetween(pick.start, pick.end);
  const market = toIndex(marketReturns(await french(FACTORS_FILE)), months);
  if (!market || market[months.length - 1] == null) throw new Error("market data unavailable");
  const prices: Record<string, Series> = {};
  if (pick.kind === "industries") {
    const table = await french(INDUSTRIES_FILE);
    for (const c of pick.pool) {
      const s = table[c.ticker] ? toIndex(table[c.ticker], months) : null;
      if (s) prices[c.ticker] = s;
    }
  } else {
    for (let i = 0; i < pick.pool.length; i += 6) {
      const batch = pick.pool.slice(i, i + 6);
      const got = await Promise.all(batch.map((c) => fromYahoo(c.ticker, months)));
      batch.forEach((c, j) => got[j] && (prices[c.ticker] = got[j]!));
    }
  }
  if (Object.keys(prices).length < 8) throw new Error("not enough price data");
  return { months, prices, market };
}

/** The day's puzzle and answer key. */
export async function puzzleFor(day: string) {
  return buildPuzzle(day, await windowData(day));
}

/** The day's simulated investors, trading the same 24 months. */
export async function simulatedFor(day: string) {
  "use cache";
  cacheLife("max");
  const { puzzle } = await puzzleFor(day);
  return simulateReturns(puzzle.prices, puzzle.months.length, seedFor(`sim:${day}`));
}
