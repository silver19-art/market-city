import { describe, expect, it } from "vitest";
import { monthKey, parseStooqCsv, parseYahooChart } from "./history";

const months = ["2008-08", "2008-09", "2008-10"];
const ts = (iso: string) => Date.parse(iso) / 1000;

describe("history parsing", () => {
  it("month keys survive time zones", () => {
    expect(monthKey(ts("2008-09-01T04:00:00Z"))).toBe("2008-09");
    expect(monthKey(ts("2008-08-31T23:00:00-04:00"))).toBe("2008-09");
  });

  it("Yahoo chart: adjusted close aligned to months, gaps as null", () => {
    const json = {
      chart: {
        result: [
          {
            timestamp: [ts("2008-09-01T04:00:00Z"), ts("2008-10-01T04:00:00Z")],
            indicators: { quote: [{ close: [30, 20] }], adjclose: [{ adjclose: [28.5, 19] }] },
          },
        ],
      },
    };
    expect(parseYahooChart(json, months)).toEqual([null, 28.5, 19]);
    expect(parseYahooChart({ chart: { result: null, error: { code: "Not Found" } } }, months)).toBeNull();
  });

  it("Stooq CSV", () => {
    const csv = "Date,Open,High,Low,Close,Volume\n2008-08-29,1,1,1,40.1,100\n2008-10-31,1,1,1,22.5,100\n";
    expect(parseStooqCsv(csv, months)).toEqual([40.1, null, 22.5]);
    expect(parseStooqCsv("No data", months)).toBeNull();
  });
});
