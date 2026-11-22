import { describe, expect, it } from "vitest";
import { ERAS } from "./eras";
import { ISLAND_D, ISLAND_W, blocked, isPark, nearestStreet, planFillers, planStocks } from "./cityplan";

describe("city plan", () => {
  it("gives every company in every era its own lot on a building block", () => {
    for (const era of ERAS) {
      const { lots, used } = planStocks(era.companies);
      expect(lots).toHaveLength(era.companies.length);
      const spots = new Set(lots.map((l) => `${l.x.toFixed(2)},${l.z.toFixed(2)}`));
      expect(spots.size).toBe(lots.length);
      for (const l of lots) expect(blocked(l.x, l.z)).toBe(true);
      for (const key of used) {
        const [r, c] = key.split(":").map(Number);
        expect(isPark(r, c)).toBe(false);
      }
    }
  });

  it("keeps each sector on its own rows", () => {
    const { lots } = planStocks(ERAS[0].companies);
    const rowsBySector = new Map<string, Set<number>>();
    for (const l of lots) rowsBySector.set(l.sector, (rowsBySector.get(l.sector) ?? new Set()).add(Math.round(l.z * 10)));
    const all = [...rowsBySector.values()].flatMap((s) => [...s]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("puts fillers off the stock blocks and the park", () => {
    const { used, lots } = planStocks(ERAS[1].companies);
    const fillers = planFillers(used);
    expect(fillers.length).toBeGreaterThan(300);
    for (const l of lots) for (const f of fillers) expect(Math.hypot(f.x - l.x, f.z - l.z)).toBeGreaterThan(1.5);
  });

  it("drops walkers onto open street", () => {
    for (const [x, z] of [
      [0, 0],
      [10, -30],
      [-ISLAND_W, ISLAND_D],
      [3.3, 41.7],
    ]) {
      const p = nearestStreet(x, z);
      expect(blocked(p.x, p.z)).toBe(false);
    }
    expect(blocked(ISLAND_W, 0)).toBe(true);
  });
});
