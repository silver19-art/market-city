/**
 * The daily Mystery Market: everyone gets the same 24-month stretch of US market history each day,
 * picked from anywhere between 1927 and today, but never overlapping one of the playable eras,
 * so the daily game is always a part of history you can't play anywhere else. You see what you're trading, but the dates and news
 * are hidden until the end and prices are rebased to $100.
 * Before 1985 the towers are industries (free stock-by-stock data starts then); after, real companies.
 */
import { advance, buy, cover, newGame, portfolioValue, sell, short, STARTING_CASH, type GameState, type Prices, type Trade } from "./engine";
import { ERAS, monthsBetween, type Company, type Sector } from "./eras";
import { rng } from "./cityplan";

export const DAILY_MONTHS = 24;
/** 24 months in 60 seconds. */
export const DAILY_MS_PER_MONTH = 2500;
/** Day #1 of the Mystery Market. */
export const LAUNCH_DAY = "2026-11-22";

/** Puzzle number for sharing, like a Wordle number. */
export function puzzleNumber(day: string) {
  return Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${LAUNCH_DAY}T12:00:00Z`)) / 86400000) + 1;
}

function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

/**
 * Your Mystery Market history, one square per day from your first game to today:
 * 🟩 beat the market, 🟥 trailed it, ⬜ didn't play. Rows of seven, a week per row,
 * showing up to the last four weeks.
 */
export function historyGrid(days: Record<string, { beat: boolean }>, today: string) {
  const played = Object.keys(days).filter((d) => d <= today).sort();
  if (played.length === 0) return "";
  let start = played[0];
  const earliest = addDays(today, -27);
  if (start < earliest) start = earliest;
  const squares: string[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) squares.push(days[d] ? (days[d].beat ? "🟩" : "🟥") : "⬜");
  const rows: string[] = [];
  for (let i = 0; i < squares.length; i += 7) rows.push(squares.slice(i, i + 7).join(""));
  return rows.join("\n");
}
export const DAILY_TZ = "America/New_York";
export const FIRST_START = "1927-01";
export const LAST_START = "2024-01";
export const STOCKS_FROM = "1985-01";

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

/** Sixteen broad industries with monthly returns back to 1926. */
export const INDUSTRY_POOL: Company[] = [
  { ticker: "Autos", name: "Automakers", sector: "Industrial" },
  { ticker: "Steel", name: "Steel", sector: "Industrial" },
  { ticker: "Carry", name: "Aircraft, ships and rail cars", sector: "Industrial" },
  { ticker: "ElcEq", name: "Electrical equipment", sector: "Industrial" },
  { ticker: "Chems", name: "Chemicals", sector: "Industrial" },
  { ticker: "Oil", name: "Oil", sector: "Energy" },
  { ticker: "Util", name: "Utilities", sector: "Energy" },
  { ticker: "Mines", name: "Mining", sector: "Energy" },
  { ticker: "Telcm", name: "Telephone and media", sector: "Tech" },
  { ticker: "BusEq", name: "Business machines and computers", sector: "Tech" },
  { ticker: "Fin", name: "Banks and finance", sector: "Finance" },
  { ticker: "Trans", name: "Railroads, airlines and transport", sector: "Travel" },
  { ticker: "Rtail", name: "Retail stores", sector: "Consumer" },
  { ticker: "Food", name: "Food", sector: "Consumer" },
  { ticker: "Smoke", name: "Tobacco", sector: "Consumer" },
  { ticker: "Hlth", name: "Health care", sector: "Health" },
];

/** Long-lived US companies with free monthly history from 1985 (later listings join when they go public). */
export const STOCK_POOL: Company[] = [
  { ticker: "AAPL", name: "Apple", sector: "Tech" },
  { ticker: "MSFT", name: "Microsoft", sector: "Tech" },
  { ticker: "INTC", name: "Intel", sector: "Tech" },
  { ticker: "IBM", name: "IBM", sector: "Tech" },
  { ticker: "ORCL", name: "Oracle", sector: "Tech" },
  { ticker: "CSCO", name: "Cisco", sector: "Tech" },
  { ticker: "AMZN", name: "Amazon", sector: "Tech" },
  { ticker: "NVDA", name: "Nvidia", sector: "Tech" },
  { ticker: "GOOGL", name: "Alphabet (Google)", sector: "Tech" },
  { ticker: "JPM", name: "JPMorgan", sector: "Finance" },
  { ticker: "BAC", name: "Bank of America", sector: "Finance" },
  { ticker: "C", name: "Citigroup", sector: "Finance" },
  { ticker: "WFC", name: "Wells Fargo", sector: "Finance" },
  { ticker: "AXP", name: "American Express", sector: "Finance" },
  { ticker: "XOM", name: "Exxon Mobil", sector: "Energy" },
  { ticker: "CVX", name: "Chevron", sector: "Energy" },
  { ticker: "SLB", name: "Schlumberger", sector: "Energy" },
  { ticker: "KO", name: "Coca-Cola", sector: "Consumer" },
  { ticker: "PEP", name: "PepsiCo", sector: "Consumer" },
  { ticker: "MCD", name: "McDonald's", sector: "Consumer" },
  { ticker: "WMT", name: "Walmart", sector: "Consumer" },
  { ticker: "HD", name: "Home Depot", sector: "Consumer" },
  { ticker: "DIS", name: "Disney", sector: "Consumer" },
  { ticker: "PG", name: "Procter & Gamble", sector: "Consumer" },
  { ticker: "GE", name: "General Electric", sector: "Industrial" },
  { ticker: "BA", name: "Boeing", sector: "Industrial" },
  { ticker: "F", name: "Ford", sector: "Industrial" },
  { ticker: "CAT", name: "Caterpillar", sector: "Industrial" },
  { ticker: "MRK", name: "Merck", sector: "Health" },
  { ticker: "JNJ", name: "Johnson & Johnson", sector: "Health" },
  { ticker: "PFE", name: "Pfizer", sector: "Health" },
  { ticker: "DAL", name: "Delta Air Lines", sector: "Travel" },
];

function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export interface PuzzlePick {
  start: string;
  end: string;
  kind: "industries" | "stocks";
  /** Shuffled candidates; the server keeps up to 16 that are trading at the start. */
  pool: Company[];
}

/** Every start month whose 24-month window stays clear of the playable American eras. */
export function openStarts(): string[] {
  const eras = ERAS.filter((e) => e.region !== "world");
  return monthsBetween(FIRST_START, LAST_START).filter((start) => {
    const end = addMonths(start, DAILY_MONTHS - 1);
    return !eras.some((e) => e.start <= end && e.end >= start);
  });
}

/** Deterministic pick for a day. The same date always gives the same puzzle on every device and the server. */
export function pickPuzzle(day: string): PuzzlePick {
  const rand = rng(seedOf(`market-city:v3:${day}`));
  const starts = openStarts();
  const start = starts[Math.floor(rand() * starts.length)];
  const end = addMonths(start, DAILY_MONTHS - 1);
  const kind = start < STOCKS_FROM ? "industries" : "stocks";
  return { start, end, kind, pool: shuffle(kind === "industries" ? INDUSTRY_POOL : STOCK_POOL, rand) };
}

export const mysteryMonths = () => Array.from({ length: DAILY_MONTHS }, (_, i) => `M-${String(i + 1).padStart(2, "0")}`);

export interface Puzzle {
  day: string;
  months: string[];
  prices: Prices;
  spy: (number | null)[];
  companies: { ticker: string; name: string; sector: Sector }[];
  source: "industries" | "stocks";
}

export interface Reveal {
  from: string;
  to: string;
  /** A named era from the main game that this stretch overlaps, if any. */
  during: { id: string; name: string } | null;
  key: { label: string; ticker: string; name: string }[];
}

/** Rebase a series to 100 at its first trading month, so price levels don't reveal anything. */
function rebase(s: (number | null)[]) {
  const first = s.find((v) => v != null);
  return s.map((v) => (v == null || !first ? null : Math.round((v / first) * 100 * 10000) / 10000));
}

/**
 * Build the puzzle (sent to players) and the answer (kept on the server until they finish) from
 * window data: prices for the pick's candidates over its 24 months, plus the whole market.
 */
export function buildPuzzle(day: string, window: { months: string[]; prices: Prices; market: (number | null)[] }): { puzzle: Puzzle; reveal: Reveal } {
  const pick = pickPuzzle(day);
  // Prefer companies trading from the first month; fill up with later listings if needed.
  const trading = pick.pool.filter((c) => window.prices[c.ticker]?.[0] != null);
  const later = pick.pool.filter((c) => window.prices[c.ticker]?.[0] == null && window.prices[c.ticker]?.some((v) => v != null));
  const chosen = [...trading, ...later].slice(0, 16);
  const prices: Prices = {};
  for (const c of chosen) prices[c.ticker] = rebase(window.prices[c.ticker]);
  const era = ERAS.find((e) => e.region !== "world" && e.start <= pick.end && e.end >= pick.start);
  return {
    puzzle: {
      day,
      months: mysteryMonths(),
      prices,
      spy: rebase(window.market),
      companies: chosen.map((c) => ({ ticker: c.ticker, name: c.name, sector: c.sector })),
      source: pick.kind,
    },
    reveal: {
      from: pick.start,
      to: pick.end,
      during: era ? { id: era.id, name: era.name } : null,
      key: chosen.map((c) => ({ label: c.ticker, ticker: c.ticker, name: c.name })),
    },
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
export function replayScore(
  trades: SubmittedTrade[],
  prices: Prices,
  months = DAILY_MONTHS,
): { ok: true; value: number; ret: number; values: number[] } | { ok: false; reason: string } {
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
      if (Math.abs(done.shares - t.shares) > Math.max(1e-6, t.shares * 1e-4)) return { ok: false, reason: "Trade larger than allowed" };
      g = r.state;
    }
    if (i < trades.length && trades[i].month < m) return { ok: false, reason: "Trades out of order" };
    if (m < last) g = advance(g, prices);
  }
  if (i < trades.length) return { ok: false, reason: "Trades after the final month" };
  const value = portfolioValue(g, prices, last);
  return { ok: true, value, ret: value / STARTING_CASH - 1, values: g.valueHistory };
}
