import { describe, expect, it } from "vitest";
import { currencyOf, displayTicker, fxSymbol, toUsd } from "./currency";

describe("currency", () => {
  it("reads the exchange from the ticker", () => {
    expect(currencyOf("SAP.DE")).toBe("EUR");
    expect(currencyOf("7203.T")).toBe("JPY");
    expect(currencyOf("600519.SS")).toBe("CNY");
    expect(currencyOf("0700.HK")).toBe("HKD");
    expect(currencyOf("BIDU")).toBe("USD");
    expect(displayTicker("VOW3.DE")).toBe("VOW3");
    expect(displayTicker("AAPL")).toBe("AAPL");
  });

  it("converts with dollars-per-unit or units-per-dollar quotes and carries gaps", () => {
    expect(fxSymbol("EUR")).toEqual({ symbol: "EURUSD=X", usdPerUnit: true });
    expect(fxSymbol("JPY")).toEqual({ symbol: "JPY=X", usdPerUnit: false });
    expect(toUsd([100, 100, null], [1.2, null, 1.3], true)).toEqual([120, 120, null]);
    expect(toUsd([1000], [100], false)).toEqual([10]);
  });
});
