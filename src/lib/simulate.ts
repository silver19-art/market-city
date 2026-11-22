/**
 * Simulated investors: a few hundred computer players who trade the same real prices with simple,
 * common habits. They give every round something honest to compare against before many real people
 * have played, and the results screen always labels them as simulated.
 */
import { rng } from "./cityplan";
import { advance, buy, newGame, portfolioValue, priceAt, sell, STARTING_CASH, type GameState, type Prices } from "./engine";

export const SIM_COUNT = 400;

type Style = "holder" | "trader" | "chaser" | "panicker";
export const SIM_STYLES: { style: Style; share: number; label: string }[] = [
  { style: "holder", share: 0.4, label: "buy-and-hold investors" },
  { style: "trader", share: 0.3, label: "frequent traders" },
  { style: "chaser", share: 0.15, label: "trend chasers" },
  { style: "panicker", share: 0.15, label: "panic sellers" },
];

function pickSome<T>(list: T[], k: number, rand: () => number) {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < k && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

function spread(g: GameState, prices: Prices, tickers: string[], dollars: number) {
  for (const t of tickers) {
    const r = buy(g, prices, t, dollars / tickers.length);
    if (r.ok) g = r.state;
  }
  return g;
}

function sellAll(g: GameState, prices: Prices) {
  for (const t of Object.keys(g.shares)) {
    const r = sell(g, prices, t, "all");
    if (r.ok) g = r.state;
  }
  return g;
}

function runOne(style: Style, prices: Prices, months: number, rand: () => number): number {
  const last = months - 1;
  const listed = (m: number) => Object.keys(prices).filter((t) => priceAt(prices, t, m) != null && prices[t][m] != null);
  let g = newGame();
  const k = 1 + Math.floor(rand() * 6);
  g = spread(g, prices, pickSome(listed(0), k, rand), STARTING_CASH * (0.6 + rand() * 0.4));
  const tradeMonths = new Set(Array.from({ length: 2 + Math.floor(rand() * 5) }, () => 1 + Math.floor(rand() * (last - 1))));
  let panicked = false;

  for (let m = 0; m < last; m++) {
    g = advance(g, prices);
    const now = g.month;
    if (now >= last) break;
    if (style === "trader" && tradeMonths.has(now)) {
      const held = Object.keys(g.shares);
      if (held.length) {
        const out = held[Math.floor(rand() * held.length)];
        const r = sell(g, prices, out, "all");
        if (r.ok) g = r.state;
      }
      const into = pickSome(listed(now), 1, rand)[0];
      if (into && g.cash > 50) {
        const r = buy(g, prices, into, g.cash * (0.5 + rand() * 0.5));
        if (r.ok) g = r.state;
      }
    } else if (style === "chaser" && now % 6 === 0 && now >= 3) {
      // Buy whatever rose most over the last three months.
      const ranked = listed(now)
        .filter((t) => prices[t][now - 3] != null)
        .sort((a, b) => prices[b][now]! / prices[b][now - 3]! - prices[a][now]! / prices[a][now - 3]!);
      g = sellAll(g, prices);
      g = spread(g, prices, ranked.slice(0, 3), g.cash * 0.95);
    } else if (style === "panicker" && !panicked && portfolioValue(g, prices) < STARTING_CASH * (0.8 + rand() * 0.08)) {
      g = sellAll(g, prices);
      panicked = true;
    }
  }
  return portfolioValue(g, prices, last) / STARTING_CASH - 1;
}

/** Final returns of every simulated investor, deterministic for a given seed. */
export function simulateReturns(prices: Prices, months: number, seed: number, count = SIM_COUNT): number[] {
  const rand = rng(seed);
  const out: number[] = [];
  for (const { style, share } of SIM_STYLES) {
    const n = Math.round(count * share);
    for (let i = 0; i < n; i++) out.push(runOne(style, prices, months, rand));
  }
  return out;
}
