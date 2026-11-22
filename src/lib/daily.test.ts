import { describe, expect, it } from "vitest";
import { buildPuzzle, DAILY_MONTHS, pickPuzzle, replayScore, todayKey } from "./daily";
import { advance, buy, newGame, sell, short } from "./engine";
import { eraById, monthsBetween } from "./eras";

describe("daily mystery market", () => {
  it("picks the same puzzle for the same day and a valid window", () => {
    const a = pickPuzzle("2026-11-22");
    expect(pickPuzzle("2026-11-22")).toEqual(a);
    const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
    const eras = new Set(days.map((d) => pickPuzzle(d).eraId));
    expect(eras.size).toBeGreaterThan(4);
    for (const d of days) {
      const p = pickPuzzle(d);
      const era = eraById(p.eraId)!;
      expect(p.offset + DAILY_MONTHS).toBeLessThanOrEqual(monthsBetween(era.start, era.end).length);
      expect(p.choices).toHaveLength(4);
      expect(p.choices).toContain(p.eraId);
    }
  });

  it("uses New York dates", () => {
    expect(todayKey(new Date("2026-11-22T03:00:00Z"))).toBe("2026-11-21");
    expect(todayKey(new Date("2026-11-22T06:00:00Z"))).toBe("2026-11-22");
  });

  it("hides names and rebases prices to 100", () => {
    const pick = pickPuzzle("2026-11-22");
    const era = eraById(pick.eraId)!;
    const months = monthsBetween(era.start, era.end);
    const prices = Object.fromEntries(era.companies.map((c, i) => [c.ticker, months.map((_, m) => 10 + i + m)]));
    const { puzzle, reveal } = buildPuzzle("2026-11-22", { months, prices, spy: months.map((_, m) => 50 + m) });
    expect(puzzle.months).toHaveLength(DAILY_MONTHS);
    expect(Object.values(puzzle.prices).every((s) => s[0] === 100)).toBe(true);
    const shown = JSON.stringify({ ...puzzle, choices: [] });
    for (const c of era.companies) expect(shown).not.toContain(`"${c.name}"`);
    expect(Object.keys(puzzle.prices).every((k) => /^[A-Z]$/.test(k))).toBe(true);
    expect(reveal.key[0].label).toBe("A");
    expect(reveal.from).toBe(months[pick.offset]);
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
