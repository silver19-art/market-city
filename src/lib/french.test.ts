import { describe, expect, it } from "vitest";
import { marketReturns, parseFrenchMonthly, toIndex } from "./french";

const INDUSTRIES = `This file was created by CMPT_IND_RETS using the 202509 CRSP database.

  Average Value Weighted Returns -- Monthly
,Food ,Beer ,Smoke ,Autos
192607,   0.56,  -5.19,   1.29,   1.00
192608,   2.59,  27.03,   6.50,  -2.00
192609,   1.16,   4.02,   1.26, -99.99

  Average Equal Weighted Returns -- Monthly
,Food ,Beer ,Smoke ,Autos
192607,   9.99,   9.99,   9.99,   9.99
`;

const FACTORS = `This file was created by CMPT_ME_BEME_RETS using the 202509 CRSP database.

,Mkt-RF,SMB,HML,RF
192607,    2.89,   -2.55,   -2.39,    0.22
192608,    2.64,   -1.14,    3.81,    0.25

 Annual Factors: January-December
,Mkt-RF,SMB,HML,RF
1927,   29.47,   -2.04,   -4.54,    3.12
`;

describe("French data library", () => {
  it("reads only the first monthly table and skips missing values", () => {
    const t = parseFrenchMonthly(INDUSTRIES);
    expect(Object.keys(t)).toEqual(["Food", "Beer", "Smoke", "Autos"]);
    expect(t.Food.get("1926-08")).toBeCloseTo(0.0259);
    expect(t.Autos.has("1926-09")).toBe(false);
    expect(t.Food.size).toBe(3);
  });

  it("builds an index starting at 100 and carries gaps forward", () => {
    const t = parseFrenchMonthly(INDUSTRIES);
    const idx = toIndex(t.Autos, ["1926-06", "1926-07", "1926-08", "1926-09"]);
    expect(idx).toEqual([null, 100, 98, 98]);
  });

  it("adds the risk-free rate back for the total market return and ignores annual rows", () => {
    const m = marketReturns(parseFrenchMonthly(FACTORS));
    expect(m.size).toBe(2);
    expect(m.get("1926-07")).toBeCloseTo(0.0311);
  });
});
