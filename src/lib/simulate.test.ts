import { describe, expect, it } from "vitest";
import { simulateReturns, SIM_COUNT } from "./simulate";

const months = 24;
const up = Array.from({ length: months }, (_, i) => 100 * 1.02 ** i);
const down = Array.from({ length: months }, (_, i) => 100 * 0.98 ** i);
const flat = Array.from({ length: months }, () => 100);
const prices = { UP: up, DOWN: down, FLAT: flat, LATE: [...Array(6).fill(null), ...up.slice(6)] };

describe("simulated investors", () => {
  it("is deterministic and the right size", () => {
    const a = simulateReturns(prices, months, 7);
    expect(a).toHaveLength(SIM_COUNT);
    expect(simulateReturns(prices, months, 7)).toEqual(a);
  });

  it("produces a spread of sensible outcomes bounded by the best and worst stock", () => {
    const r = simulateReturns(prices, months, 11);
    const best = up[months - 1] / up[0] - 1;
    const worst = down[months - 1] / down[0] - 1;
    expect(Math.max(...r)).toBeLessThanOrEqual(best + 1e-9);
    expect(Math.min(...r)).toBeGreaterThanOrEqual(worst - 0.01);
    expect(new Set(r.map((x) => x.toFixed(3))).size).toBeGreaterThan(50);
  });
});
