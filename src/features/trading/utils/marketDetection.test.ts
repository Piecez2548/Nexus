import { describe, expect, it } from "vitest";
import { detectMarketFromSymbol } from "./marketDetection";

describe("detectMarketFromSymbol", () => {
  it("detects commodity CFDs", () => {
    expect(detectMarketFromSymbol("XAUUSD")).toBe("cfd");
  });

  it("detects crypto pairs", () => {
    expect(detectMarketFromSymbol("BTCUSD")).toBe("crypto");
  });

  it("detects forex majors", () => {
    expect(detectMarketFromSymbol("EURUSD")).toBe("forex");
  });

  it("detects index symbols", () => {
    expect(detectMarketFromSymbol("US30")).toBe("indices");
  });

  it("is case-insensitive and ignores separators", () => {
    expect(detectMarketFromSymbol("eur/usd")).toBe("forex");
  });

  it("returns null for an unrecognized symbol", () => {
    expect(detectMarketFromSymbol("AAPL")).toBeNull();
  });

  it("returns null for an empty symbol", () => {
    expect(detectMarketFromSymbol("")).toBeNull();
    expect(detectMarketFromSymbol("   ")).toBeNull();
  });
});
