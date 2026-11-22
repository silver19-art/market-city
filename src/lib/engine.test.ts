import { describe, expect, it } from "vitest";
import { advance, buy, maxDrawdown, newGame, portfolioValue, priceAt, report, sell, STARTING_CASH, TRADE_FEE, type Prices, short, cover } from "./engine";
import { ERAS, monthsBetween } from "./eras";

const prices: Prices = {
  AAA: [10, 20, 5, 40],
  BBB: [null, 50, 50, 25],
};
const spy = [100, 110, 90, 120];

describe("eras", () => {
  it("month lists are inclusive", () => {
    expect(monthsBetween("1999-11", "2000-02")).toEqual(["1999-11", "1999-12", "2000-01", "2000-02"]);
  });
  it("every era is well formed", () => {
    expect(ERAS.length).toBe(11);
    const FF30 = "Food Beer Smoke Games Books Hshld Clths Hlth Chems Txtls Cnstr Steel FabPr ElcEq Autos Carry Mines Coal Oil Util Telcm Servs BusEq Paper Trans Whlsl Rtail Meals Fin Other".split(" ");
    for (const e of ERAS) {
      const months = monthsBetween(e.start, e.end);
      expect(months.length).toBeGreaterThan(24);
      expect(new Set(e.companies.map((c) => c.ticker)).size).toBe(e.companies.length);
      for (const ev of e.events) expect(months).toContain(ev.month);
      if (e.source === "industries") for (const c of e.companies) expect(FF30).toContain(c.ticker);
      // SPY only exists from 1993, so earlier eras must benchmark against the whole market.
      if (e.start < "1993-02") expect(e.benchmark).toBe("MARKET");
    }
  });
});

describe("trading", () => {
  it("buys fractional shares and charges the fee", () => {
    const r = buy(newGame(), prices, "AAA", 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.shares.AAA).toBe(100);
    expect(r.state.cash).toBe(STARTING_CASH - 1000 - TRADE_FEE);
    expect(r.state.feesPaid).toBe(TRADE_FEE);
  });

  it("can't buy before a stock trades or with no cash", () => {
    expect(buy(newGame(), prices, "BBB", 100).ok).toBe(false);
    const all = buy(newGame(), prices, "AAA", 1e9);
    expect(all.ok && all.state.cash).toBeCloseTo(0, 6);
    if (all.ok) expect(buy(all.state, prices, "AAA", 10).ok).toBe(false);
  });

  it("portfolio value follows prices month by month", () => {
    let s = buy(newGame(), prices, "AAA", 1000);
    if (!s.ok) throw new Error();
    let g = advance(s.state, prices); // month 1, price 20
    expect(portfolioValue(g, prices)).toBeCloseTo(STARTING_CASH - TRADE_FEE + 1000, 6);
    g = advance(g, prices); // month 2, price 5
    expect(g.valueHistory).toHaveLength(3);
    const sold = sell(g, prices, "AAA", "all");
    expect(sold.ok).toBe(true);
    if (sold.ok) {
      expect(sold.state.shares.AAA).toBeUndefined();
      expect(sold.state.cash).toBeCloseTo(STARTING_CASH - 1000 - 2 * TRADE_FEE + 500, 6);
    }
    s = buy(g, prices, "BBB", 500);
    expect(s.ok).toBe(true);
  });

  it("partial sells and guards", () => {
    const b = buy(newGame(), prices, "AAA", 1000);
    if (!b.ok) throw new Error();
    const half = sell(b.state, prices, "AAA", 500);
    expect(half.ok && half.state.shares.AAA).toBeCloseTo(50, 6);
    expect(sell(b.state, prices, "BBB", 10).ok).toBe(false);
    expect(sell(b.state, prices, "AAA", 3).ok).toBe(false); // smaller than the fee
  });

  it("priceAt carries the last known price forward", () => {
    expect(priceAt({ X: [5, null, null] }, "X", 2)).toBe(5);
    expect(priceAt({ X: [null, null] }, "X", 1)).toBeNull();
  });
});

describe("report", () => {
  it("max drawdown", () => {
    expect(maxDrawdown([100, 150, 75, 120])).toBeCloseTo(0.5, 6);
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });

  it("compares with the S&P 500 and an equal-weight city", () => {
    let g = newGame();
    const b = buy(g, prices, "AAA", 5000);
    if (!b.ok) throw new Error();
    g = b.state;
    for (let i = 0; i < 3; i++) g = advance(g, prices);
    const rep = report(g, prices, spy, ["AAA", "BBB"]);
    expect(rep.finalValue).toBeCloseTo(STARTING_CASH - 5000 - TRADE_FEE + 500 * 40, 6);
    expect(rep.benchmarkReturn).toBeCloseTo(0.2, 6);
    expect(rep.beatMarket).toBe(true);
    expect(rep.equalWeightReturn).toBeCloseTo(3, 6); // only AAA traded at the start: 10 → 40
    expect(rep.best?.ticker).toBe("AAA");
    expect(rep.trades).toBe(1);
  });
});

describe("short selling", () => {
  const prices = { AAA: [100, 50, 200, 400], BBB: [10, 10, 10, 10] };
  it("profits when the price falls", () => {
    let g = newGame();
    const r = short(g, prices, "AAA", 2000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    g = r.state;
    expect(g.shares.AAA).toBeCloseTo(-20);
    expect(portfolioValue(g, prices)).toBeCloseTo(10000 - 5);
    g = advance(g, prices); // price halves
    expect(portfolioValue(g, prices)).toBeCloseTo(10000 - 5 + 1000);
    const c = cover(g, prices, "AAA", "all");
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.state.shares.AAA).toBeUndefined();
      expect(c.state.cash).toBeCloseTo(10000 - 5 + 1000 - 5);
    }
  });

  it("blocks shorting beyond the account value and mixing long with short", () => {
    const g = newGame();
    const r = short(g, prices, "AAA", 50000);
    expect(r.ok && -r.state.shares.AAA * 100).toBeCloseTo(10000);
    const b = buy(g, prices, "BBB", 100);
    expect(b.ok && short(b.state, prices, "BBB", 100).ok).toBe(false);
    const s = short(g, prices, "BBB", 100);
    expect(s.ok && buy(s.state, prices, "BBB", 100).ok).toBe(false);
  });

  it("force-covers shorts in a margin call when the account runs low", () => {
    let g = newGame();
    const r = short(g, prices, "AAA", 10000);
    if (!r.ok) throw new Error(r.reason);
    g = advance(r.state, prices); // 50: fine
    expect(g.marginCalls).toEqual([]);
    g = advance(g, prices); // 200: owes 20,000 against ~0 equity
    expect(g.marginCalls).toEqual([2]);
    expect(g.shares.AAA).toBeUndefined();
    expect(g.trades.at(-1)?.forced).toBe(true);
  });
});

describe("descriptions", () => {
  it("every company and industry in every era has one", async () => {
    const { aboutFor } = await import("./about");
    for (const e of ERAS) for (const c of e.companies) expect(aboutFor(e.id, c.ticker), `${e.id} ${c.ticker}`).toBeTruthy();
  });
});

describe("blurbs", () => {
  it("drop a repeated company name but keep different ones", async () => {
    const { blurbFor } = await import("./about");
    expect(blurbFor("crisis", "MCD", "McDonald's")).toMatch(/^The world's largest restaurant chain/);
    expect(blurbFor("dotcom", "C", "Citigroup")).toMatch(/^Travelers Group/);
    expect(blurbFor("ai", "GOOGL", "Alphabet (Google)")).toMatch(/^Google's parent company/);
  });
});
