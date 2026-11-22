/**
 * The daily Mystery Market: everyone gets the same hidden 24-month stretch of history each day.
 * Dates, names and news are hidden; prices are rebased to $100 so nothing gives the era away.
 */
import { advance, buy, cover, newGame, portfolioValue, sell, short, STARTING_CASH, type GameState, type Prices, type Trade } from "./engine";
import { ERAS, eraById, monthsBetween, type Company, type Sector } from "./eras";
import { rng } from "./cityplan";

export const DAILY_MONTHS = 24;
export const DAILY_TZ = "America/New_York";

/** Today's puzzle date (YYYY-MM-DD), switching at midnight New York time. */
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DAILY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isValidDay(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffle<T>(list: T[], rand: () => number) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PuzzlePick {
  eraId: string;
  /** Index of the first month within the era. */
  offset: number;
  /** Era companies in the order they get the letters A, B, C… */
  order: Company[];
  /** Four era ids for the "which era was it?" question, one of them correct. */
  choices: string[];
}

/** Deterministic pick for a day. The same date always gives the same puzzle on every device and the server. */
export function pickPuzzle(day: string): PuzzlePick {
  const rand = rng(seedOf(`market-city:${day}`));
  const era = ERAS[Math.floor(rand() * ERAS.length)];
  const total = monthsBetween(era.start, era.end).length;
  const offset = Math.floor(rand() * (total - DAILY_MONTHS + 1));
  const order = shuffle(era.companies, rand);
  const others = shuffle(
    ERAS.filter((e) => e.id !== era.id),
    rand,
  ).slice(0, 3);
  const choices = shuffle([era.id, ...others.map((e) => e.id)], rand);
  return { eraId: era.id, offset, order, choices };
}

export const letter = (i: number) => String.fromCharCode(65 + i);
export const mysteryMonths = () => Array.from({ length: DAILY_MONTHS }, (_, i) => `M-${String(i + 1).padStart(2, "0")}`);

export interface Puzzle {
  day: string;
  months: string[];
  prices: Prices;
  spy: (number | null)[];
  companies: { ticker: string; name: string; sector: Sector }[];
  choices: { id: string; name: string; years: string }[];
}

export interface Reveal {
  eraId: string;
  eraName: string;
  from: string;
  to: string;
  key: { label: string; ticker: string; name: string }[];
}

/** Rebase a series to 100 at its first trading month, so price levels don't reveal anything. */
function rebase(s: (number | null)[]) {
  const first = s.find((v) => v != null);
  return s.map((v) => (v == null || !first ? null : Math.round((v / first) * 100 * 10000) / 10000));
}

/** Build the anonymized puzzle (sent to players) and the answer key (kept on the server until they finish). */
export function buildPuzzle(day: string, era: { months: string[]; prices: Prices; spy: (number | null)[] }): { puzzle: Puzzle; reveal: Reveal } {
  const pick = pickPuzzle(day);
  const info = eraById(pick.eraId)!;
  const slice = (s: (number | null)[]) => s.slice(pick.offset, pick.offset + DAILY_MONTHS);
  const prices: Prices = {};
  const companies: Puzzle["companies"] = [];
  const key: Reveal["key"] = [];
  pick.order
    .filter((c) => era.prices[c.ticker] && slice(era.prices[c.ticker]).some((v) => v != null))
    .forEach((c, i) => {
      const label = letter(i);
      prices[label] = rebase(slice(era.prices[c.ticker]));
      companies.push({ ticker: label, name: `Stock ${label}`, sector: c.sector });
      key.push({ label, ticker: c.ticker, name: c.name });
    });
  const window = era.months.slice(pick.offset, pick.offset + DAILY_MONTHS);
  return {
    puzzle: {
      day,
      months: mysteryMonths(),
      prices,
      spy: rebase(slice(era.spy)),
      companies,
      choices: pick.choices.map((id) => {
        const e = eraById(id)!;
        return { id, name: e.name, years: e.years };
      }),
    },
    reveal: { eraId: info.id, eraName: info.name, from: window[0], to: window[window.length - 1], key },
  };
}

export interface SubmittedTrade {
  month: number;
  ticker: string;
  side: Trade["side"];
  shares: number;
}

/**
 * Re-run a player's trades against the real prices to compute their score on the server,
 * so nobody can post a made-up number. Trades are only allowed before the last month.
 */
export function replayScore(trades: SubmittedTrade[], prices: Prices, months = DAILY_MONTHS): { ok: true; value: number; ret: number } | { ok: false; reason: string } {
  if (!Array.isArray(trades) || trades.length > 500) return { ok: false, reason: "Too many trades" };
  const last = months - 1;
  let g: GameState = newGame();
  let i = 0;
  for (let m = 0; m <= last; m++) {
    while (i < trades.length && trades[i].month === m) {
      const t = trades[i++];
      if (m >= last) return { ok: false, reason: "Trades after the final month" };
      if (!(t.shares > 0) || !prices[t.ticker]) return { ok: false, reason: "Bad trade" };
      const p = prices[t.ticker][m];
      if (p == null) return { ok: false, reason: "Bad trade" };
      const dollars = t.shares * p;
      const r = t.side === "buy" ? buy(g, prices, t.ticker, dollars) : t.side === "sell" ? sell(g, prices, t.ticker, dollars) : t.side === "short" ? short(g, prices, t.ticker, dollars) : cover(g, prices, t.ticker, dollars);
      if (!r.ok) return { ok: false, reason: r.reason };
      // Buys and shorts quietly shrink to what's affordable, so check the trade went through at full size.
      const done = r.state.trades[r.state.trades.length - 1];
      if (Math.abs(done.shares - t.shares) > Math.max(1e-6, t.shares * 1e-6)) return { ok: false, reason: "Trade larger than allowed" };
      g = r.state;
    }
    if (i < trades.length && trades[i].month < m) return { ok: false, reason: "Trades out of order" };
    if (m < last) g = advance(g, prices);
  }
  if (i < trades.length) return { ok: false, reason: "Trades after the final month" };
  const value = portfolioValue(g, prices, last);
  return { ok: true, value, ret: value / STARTING_CASH - 1 };
}
