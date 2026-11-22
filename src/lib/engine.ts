/** Pure game engine: trading, portfolio value, and the end-of-round report. Unit tested. */

export const STARTING_CASH = 10_000;
/** Flat cost per trade, so overtrading has a visible price. */
export const TRADE_FEE = 5;

export type Prices = Record<string, (number | null)[]>; // ticker → close per month index

export interface Trade {
  month: number;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  price: number;
  fee: number;
}

export interface GameState {
  month: number;
  cash: number;
  shares: Record<string, number>;
  trades: Trade[];
  feesPaid: number;
  /** Portfolio value at the end of each month played so far. */
  valueHistory: number[];
}

export const newGame = (): GameState => ({
  month: 0,
  cash: STARTING_CASH,
  shares: {},
  trades: [],
  feesPaid: 0,
  valueHistory: [STARTING_CASH],
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

export type TradeResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** Buy `dollars` worth (fractional shares allowed). The fee comes out of cash on top. */
export function buy(state: GameState, prices: Prices, ticker: string, dollars: number): TradeResult {
  const p = priceAt(prices, ticker, state.month);
  if (!p) return { ok: false, reason: `${ticker} isn't trading yet` };
  if (dollars <= 0) return { ok: false, reason: "Enter an amount above $0" };
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

/** Move to the next month and record the portfolio's value. */
export function advance(state: GameState, prices: Prices): GameState {
  const month = state.month + 1;
  const next = { ...state, month };
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
  cashShare: number; // share of the final portfolio sitting in cash
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

  // Realized + unrealized return by ticker the player traded (money-weighted by dollars in vs out).
  const flows: Record<string, { in: number; out: number }> = {};
  for (const t of state.trades) {
    const f = (flows[t.ticker] ??= { in: 0, out: 0 });
    if (t.side === "buy") f.in += t.shares * t.price;
    else f.out += t.shares * t.price;
  }
  const perTicker = Object.entries(flows)
    .map(([ticker, f]) => {
      const held = (state.shares[ticker] ?? 0) * (priceAt(prices, ticker, last) ?? 0);
      return { ticker, ret: f.in > 0 ? (f.out + held) / f.in - 1 : 0 };
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
    cashShare: finalValue > 0 ? state.cash / finalValue : 0,
    best: perTicker[0] ?? null,
    worst: perTicker.length > 1 ? perTicker[perTicker.length - 1] : null,
    equalWeightReturn: rv.length ? rv.reduce((a, b) => a + b, 0) / rv.length : null,
  };
}
