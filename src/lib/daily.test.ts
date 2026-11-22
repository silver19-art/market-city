import { describe, expect, it } from "vitest";
import { buildPuzzle, DAILY_MONTHS, FIRST_START, LAST_START, pickPuzzle, replayScore, STOCKS_FROM, todayKey } from "./daily";
import { advance, buy, newGame, sell, short } from "./engine";
import { monthsBetween } from "./eras";

describe("daily mystery market", () => {
  it("picks the same puzzle for the same day, from anywhere since 1927", () => {
    const a = pickPuzzle("2026-11-22");
    expect(pickPuzzle("2026-11-22")).toEqual(a);
    const days = Array.from({ length: 200 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
    const decades = new Set(days.map((d) => pickPuzzle(d).start.slice(0, 3)));
    expect(decades.size).toBeGreaterThan(7);
    for (const d of days) {
      const p = pickPuzzle(d);
      expect(p.start >= FIRST_START && p.start <= LAST_START).toBe(true);
      expect(monthsBetween(p.start, p.end)).toHaveLength(DAILY_MONTHS);
      expect(p.kind).toBe(p.start < STOCKS_FROM ? "industries" : "stocks");
    }
  });

  it("uses New York dates", () => {
    expect(todayKey(new Date("2026-11-22T03:00:00Z"))).toBe("2026-11-21");
    expect(todayKey(new Date("2026-11-22T06:00:00Z"))).toBe("2026-11-22");
  });

  it("shows up to 16 trading names, rebases prices to 100 and hides the dates", () => {
    const pick = pickPuzzle("2026-11-22");
    const months = monthsBetween(pick.start, pick.end);
    const prices = Object.fromEntries(pick.pool.map((c, i) => [c.ticker, months.map((_, m) => (i === 0 && m < 5 ? null : 10 + i + m))]));
    const { puzzle, reveal } = buildPuzzle("2026-11-22", { months, prices, market: months.map((_, m) => 50 + m) });
    expect(puzzle.months).toHaveLength(DAILY_MONTHS);
    expect(puzzle.companies.length).toBe(Math.min(16, pick.pool.length));
    expect(puzzle.companies.map((c) => c.ticker)).not.toContain(pick.pool[0].ticker); // late listings only fill gaps
    expect(Object.values(puzzle.prices).every((s) => s[0] === 100)).toBe(true);
    expect(JSON.stringify(puzzle)).not.toContain(pick.start);
    expect(reveal.from).toBe(pick.start);
  });

  it("re-scores trades on the server and rejects impossible ones", () => {
    const prices = { A: [100, 120, 90, ...Array(21).fill(150)], B: Array(24).fill(100) };
    let g = newGame();
    const b = buy(g, prices, "A", 5000);
    if (!b.ok) throw new Error();
    g = advance(advance(b.state, prices), prices);
    const s = short(g, prices, "B", 1000);
    if (!s.ok) throw new Error();
    g = s.state;
    const trades = g.trades.map((t) => ({ month: t.month, ticker: t.ticker, side: t.side, shares: t.shares }));
    let fin = g;
    while (fin.month < 23) fin = advance(fin, prices);
    const r = replayScore(trades, prices);
    expect(r.ok && r.value).toBeCloseTo(fin.cash + fin.shares.A * 150 + fin.shares.B * 100, 6);
    expect(replayScore([{ month: 0, ticker: "A", side: "buy", shares: 1000 }], prices).ok).toBe(false);
    expect(replayScore([{ month: 23, ticker: "A", side: "buy", shares: 1 }], prices).ok).toBe(false);
    expect(replayScore([{ month: 0, ticker: "A", side: "sell", shares: 1 }], prices).ok).toBe(false);
    const sold = sell(b.state, prices, "A", "all");
    expect(sold.ok).toBe(true);
  });
});
