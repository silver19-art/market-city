import { describe, expect, it } from "vitest";
import { histogram, percentileOf, standingFrom } from "./standings";

describe("standings", () => {
  it("computes the share of other players you beat", () => {
    expect(percentileOf(0.1, [])).toBeNull();
    expect(percentileOf(0.1, [0, 0.05, 0.2, 0.3])).toBe(0.5);
    expect(percentileOf(0.1, [0.1, 0])).toBe(0.75);
  });

  it("uses labeled simulated investors until enough real people have played", () => {
    const sims = Array.from({ length: 100 }, (_, i) => i / 100 - 0.5);
    const early = standingFrom(0.25, [0.1], sims);
    expect(early.basis).toBe("simulated");
    expect(early.realPlayers).toBe(1);
    expect(early.percentile).toBeCloseTo(0.75, 1);
    const later = standingFrom(0.25, Array.from({ length: 20 }, () => 0), sims);
    expect(later.basis).toBe("players");
    expect(later.percentile).toBe(1);
  });

  it("counts you in the total", () => {
    const s = standingFrom(0.2, [0.1, 0.3, -0.1]);
    expect(s.total).toBe(4);
    expect(s.percentile).toBeCloseTo(2 / 3);
  });

  it("bins everyone, keeps you on the chart and trims extreme outliers", () => {
    const all = [...Array.from({ length: 100 }, (_, i) => i / 100), 50];
    const bins = histogram(all, 0.5);
    expect(bins).toHaveLength(24);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(101);
    expect(bins[bins.length - 1].x1).toBeLessThan(2);
    expect(bins[0].x0).toBeLessThanOrEqual(0);
  });
});
