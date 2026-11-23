import { describe, expect, it } from "vitest";
import { buildPuzzle, DAILY_MONTHS, FIRST_START, LAST_START, pickPuzzle, replayScore, STOCKS_FROM, todayKey } from "./daily";
import { advance, buy, newGame, sell, short } from "./engine";
import { ERAS, monthsBetween } from "./eras";

describe("daily mystery market", () => {
  it("picks the same puzzle for the same day, from anywhere since 1927", () => {
    const a = pickPuzzle("2026-11-22");
    expect(pickPuzzle("2026-11-22")).toEqual(a);
    const days = Array.from({ length: 200 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
    const decades = new Set(days.map((d) => pickPuzzle(d).start.slice(0, 3)));
    expect(decades.size).toBeGreaterThan(5);
    for (const d of days) {
      const p = pickPuzzle(d);
      expect(p.start >= FIRST_START && p.start <= LAST_START).toBe(true);
      expect(monthsBetween(p.start, p.end)).toHaveLength(DAILY_MONTHS);
      expect(p.kind).toBe(p.start < STOCKS_FROM ? "industries" : "stocks");
      for (const e of ERAS.filter((x) => x.region !== "world")) expect(e.start <= p.end && e.end >= p.start, `${d} overlaps ${e.id}`).toBe(false);
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
    // A company that lists later only fills a gap, so it comes after everything trading from month one.
    const tickers = puzzle.companies.map((c) => c.ticker);
    if (pick.pool.length > 16) expect(tickers).not.toContain(pick.pool[0].ticker);
    else expect(tickers[tickers.length - 1]).toBe(pick.pool[0].ticker);
    expect(Object.values(puzzle.prices).every((s) => s.find((v) => v != null) === 100)).toBe(true);
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

describe("sharing", () => {
  it("numbers puzzles from launch day", async () => {
    const { puzzleNumber } = await import("./daily");
    expect(puzzleNumber("2026-11-22")).toBe(1);
    expect(puzzleNumber("2026-11-23")).toBe(2);
    expect(puzzleNumber("2027-03-08")).toBe(107);
  });

  it("makes one square per day played, with gaps for missed days", async () => {
    const { historyGrid } = await import("./daily");
    expect(historyGrid({}, "2026-11-23")).toBe("");
    expect(historyGrid({ "2026-11-22": { beat: false }, "2026-11-23": { beat: true } }, "2026-11-23")).toBe("🟥🟩");
    expect(historyGrid({ "2026-11-20": { beat: true }, "2026-11-23": { beat: true } }, "2026-11-23")).toBe("🟩⬜⬜🟩");
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), { beat: true }]));
    const rows = historyGrid(many, "2026-11-09").split("\n");
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => [...r].length === 7)).toBe(true);
  });
});
