/** Pure game engine: trading, portfolio value, and the end-of-round report. Unit tested. */

export const STARTING_CASH = 10_000;
/** Flat cost per trade, so overtrading has a visible price. */
export const TRADE_FEE = 5;

export type Prices = Record<string, (number | null)[]>; // ticker → close per month index

export interface Trade {
  month: number;
  ticker: string;
  side: "buy" | "sell" | "short" | "cover";
  /** Set when the trade was forced by a margin call. */
  forced?: boolean;
  shares: number;
  price: number;
  fee: number;
}

export interface GameState {
  month: number;
  cash: number;
  /** Positive for shares owned, negative for shares sold short. */
  shares: Record<string, number>;
  trades: Trade[];
  feesPaid: number;
  /** Portfolio value at the end of each month played so far. */
  valueHistory: number[];
  /** Months in which shorts were force-covered because the account ran too low. */
  marginCalls: number[];
}

/** You can short up to this multiple of your account value in total. */
export const SHORT_LIMIT = 1;
/** If account value falls below this share of what you owe on shorts, they are bought back for you. */
export const MAINTENANCE = 0.3;

export const newGame = (): GameState => ({
  month: 0,
  cash: STARTING_CASH,
  shares: {},
  trades: [],
  feesPaid: 0,
  valueHistory: [STARTING_CASH],
  marginCalls: [],
});

export const priceAt = (prices: Prices, ticker: string, month: number): number | null => {
  const s = prices[ticker];
  if (!s) return null;
  for (let i = Math.min(month, s.length - 1); i >= 0; i--) if (s[i] != null) return s[i]!;
  return null;
};

export function portfolioValue(state: GameState, prices: Prices, month = state.month): number {
  let v = state.cash;
  for (const [t, n] of Object.entries(state.shares)) v += n * (priceAt(prices, t, month) ?? 0);
  return v;
}

/** Dollar value currently owed on all short positions. */
export function shortLiability(state: GameState, prices: Prices, month = state.month): number {
  let v = 0;
  for (const [t, n] of Object.entries(state.shares)) if (n < 0) v += -n * (priceAt(prices, t, month) ?? 0);
  return v;
}

export type TradeResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** Buy `dollars` worth (fractional shares allowed). The fee comes out of cash on top. */
export function buy(state: GameState, prices: Prices, ticker: string, dollars: number): TradeResult {
  const p = priceAt(prices, ticker, state.month);
  if (!p) return { ok: false, reason: `${ticker} isn't trading yet` };
  if (dollars <= 0) return { ok: false, reason: "Enter an amount above $0" };
  if ((state.shares[ticker] ?? 0) < 0) return { ok: false, reason: `You're short ${ticker}. Cover the short before buying.` };
  const spend = Math.min(dollars, state.cash - TRADE_FEE);
  if (spend <= 0) return { ok: false, reason: `Not enough cash (each trade costs $${TRADE_FEE})` };
  const shares = spend / p;
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - spend - TRADE_FEE,
      shares: { ...state.shares, [ticker]: (state.shares[ticker] ?? 0) + shares },
      trades: [...state.trades, { month: state.month, ticker, side: "buy", shares, price: p, fee: TRADE_FEE }],
      feesPaid: state.feesPaid + TRADE_FEE,
    },
  };
}

/** Sell `dollars` worth, or everything when `dollars` is "all". */
export function sell(state: GameState, prices: Prices, ticker: string, dollars: number | "all"): TradeResult {
  const p = priceAt(prices, ticker, state.month);
  const held = state.shares[ticker] ?? 0;
  if (!p || held <= 0) return { ok: false, reason: `You don't own ${ticker}` };
  const shares = dollars === "all" ? held : Math.min(held, dollars / p);
  if (shares <= 0) return { ok: false, reason: "Enter an amount above $0" };
  const proceeds = shares * p;
  if (proceeds <= TRADE_FEE && dollars !== "all") return { ok: false, reason: `Trade is smaller than the $${TRADE_FEE} fee` };
  const left = held - shares;
  const next = { ...state.shares };
  if (left < 1e-9) delete next[ticker];
  else next[ticker] = left;
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash + proceeds - TRADE_FEE,
      shares: next,
      trades: [...state.trades, { month: state.month, ticker, side: "sell", shares, price: p, fee: TRADE_FEE }],
      feesPaid: state.feesPaid + TRADE_FEE,
    },
  };
}

/**
 * Sell borrowed shares now, hoping to buy them back cheaper. The sale adds cash, and the
 * position shows as negative shares, so its value falls as the price rises.
 */
export function short(state: GameState, prices: Prices, ticker: string, dollars: number): TradeResult {
  const p = priceAt(prices, ticker, state.month);
  if (!p) return { ok: false, reason: `${ticker} isn't trading yet` };
  if (dollars <= 0) return { ok: false, reason: "Enter an amount above $0" };
  if ((state.shares[ticker] ?? 0) > 0) return { ok: false, reason: `You own ${ticker}. Sell it before shorting.` };
  if (dollars <= TRADE_FEE) return { ok: false, reason: `Trade is smaller than the $${TRADE_FEE} fee` };
  const room = SHORT_LIMIT * portfolioValue(state, prices) - shortLiability(state, prices);
  if (room <= TRADE_FEE) return { ok: false, reason: "You've hit your shorting limit: total shorts can't exceed your account value." };
  const amount = Math.min(dollars, room);
  const shares = amount / p;
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash + amount - TRADE_FEE,
      shares: { ...state.shares, [ticker]: (state.shares[ticker] ?? 0) - shares },
      trades: [...state.trades, { month: state.month, ticker, side: "short", shares, price: p, fee: TRADE_FEE }],
      feesPaid: state.feesPaid + TRADE_FEE,
    },
  };
}

/** Buy back shorted shares: `dollars` worth, or the whole short when "all". */
export function cover(state: GameState, prices: Prices, ticker: string, dollars: number | "all", forced = false): TradeResult {
  const p = priceAt(prices, ticker, state.month);
  const owed = -(state.shares[ticker] ?? 0);
  if (!p || owed <= 0) return { ok: false, reason: `You aren't short ${ticker}` };
  const shares = dollars === "all" ? owed : Math.min(owed, dollars / p);
  if (shares <= 0) return { ok: false, reason: "Enter an amount above $0" };
  const cost = shares * p;
  if (!forced && cost + TRADE_FEE > state.cash) return { ok: false, reason: "Not enough cash to buy those shares back" };
  const left = owed - shares;
  const next = { ...state.shares };
  if (left < 1e-9) delete next[ticker];
  else next[ticker] = -left;
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - cost - TRADE_FEE,
      shares: next,
      trades: [...state.trades, { month: state.month, ticker, side: "cover", shares, price: p, fee: TRADE_FEE, forced: forced || undefined }],
      feesPaid: state.feesPaid + TRADE_FEE,
    },
  };
}

/** Move to the next month, run any margin call, and record the portfolio's value. */
export function advance(state: GameState, prices: Prices): GameState {
  const month = state.month + 1;
  let next: GameState = { ...state, month };
  const owed = shortLiability(next, prices, month);
  if (owed > 0 && portfolioValue(next, prices, month) < MAINTENANCE * owed) {
    for (const [t, n] of Object.entries(next.shares)) {
      if (n >= 0) continue;
      const r = cover(next, prices, t, "all", true);
      if (r.ok) next = r.state;
    }
    next = { ...next, marginCalls: [...next.marginCalls, month] };
  }
  return { ...next, valueHistory: [...state.valueHistory, portfolioValue(next, prices, month)] };
}

/** Largest peak-to-trough fall, as a positive fraction (0.35 = −35%). */
export function maxDrawdown(values: number[]): number {
  let peak = -Infinity;
  let dd = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    if (peak > 0) dd = Math.max(dd, (peak - v) / peak);
  }
  return dd;
}

export interface Report {
  finalValue: number;
  totalReturn: number;
  benchmarkReturn: number | null;
  beatMarket: boolean | null;
  maxDrawdown: number;
  benchmarkDrawdown: number | null;
  trades: number;
  feesPaid: number;
  cashShare: number; // share of the final portfolio sitting in free cash (not counting short proceeds)
  marginCalls: number;
  shorted: boolean;
  best: { ticker: string; ret: number } | null;
  worst: { ticker: string; ret: number } | null;
  /** Return from splitting $10,000 evenly across every company trading at the start and holding. */
  equalWeightReturn: number | null;
}

/** Return of each stock that was trading in the first month, through `last`. */
function stockReturns(prices: Prices, last: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [t, s] of Object.entries(prices)) {
    const first = s[0];
    const end = priceAt(prices, t, last);
    if (first && end) out[t] = end / first - 1;
  }
  return out;
}

export function report(state: GameState, prices: Prices, benchmark: (number | null)[], tickers: string[]): Report {
  const last = state.month;
  const finalValue = portfolioValue(state, prices, last);
  const b0 = benchmark.find((x) => x != null);
  const bEnd = priceAt({ b: benchmark }, "b", last);
  const benchmarkReturn = b0 && bEnd ? bEnd / b0 - 1 : null;
  const bValues = benchmark.slice(0, last + 1).filter((x): x is number => x != null);

  // Realized + unrealized profit by ticker, over the capital put at risk (dollars bought plus dollars shorted).
  const flows: Record<string, { in: number; out: number; capital: number }> = {};
  for (const t of state.trades) {
    const f = (flows[t.ticker] ??= { in: 0, out: 0, capital: 0 });
    const amt = t.shares * t.price;
    if (t.side === "buy" || t.side === "cover") f.in += amt;
    else f.out += amt;
    if (t.side === "buy" || t.side === "short") f.capital += amt;
  }
  const perTicker = Object.entries(flows)
    .map(([ticker, f]) => {
      const held = (state.shares[ticker] ?? 0) * (priceAt(prices, ticker, last) ?? 0);
      return { ticker, ret: f.capital > 0 ? (f.out + held - f.in) / f.capital : 0 };
    })
    .sort((a, b) => b.ret - a.ret);

  const rets = stockReturns(
    Object.fromEntries(tickers.map((t) => [t, prices[t] ?? []])),
    last,
  );
  const rv = Object.values(rets);

  return {
    finalValue,
    totalReturn: finalValue / STARTING_CASH - 1,
    benchmarkReturn,
    beatMarket: benchmarkReturn === null ? null : finalValue / STARTING_CASH - 1 > benchmarkReturn,
    maxDrawdown: maxDrawdown(state.valueHistory),
    benchmarkDrawdown: bValues.length ? maxDrawdown(bValues) : null,
    trades: state.trades.length,
    feesPaid: state.feesPaid,
    cashShare: finalValue > 0 ? Math.max(0, state.cash - shortLiability(state, prices, last)) / finalValue : 0,
    marginCalls: state.marginCalls.length,
    shorted: state.trades.some((t) => t.side === "short"),
    best: perTicker[0] ?? null,
    worst: perTicker.length > 1 ? perTicker[perTicker.length - 1] : null,
    equalWeightReturn: rv.length ? rv.reduce((a, b) => a + b, 0) / rv.length : null,
  };
}
