import { describe, expect, it } from "vitest";
import { costBasis, currentValue, unrealizedPnl, unrealizedPnlPercent, valuateHolding } from "./valuation";
import type { Holding } from "@/features/portfolio/types";

const baseHolding: Holding = {
  symbol: "AAPL",
  market: "stocks",
  quantity: 10,
  avgCostPrice: 100,
  createdAt: "2026-07-21T00:00:00.000Z",
};

describe("costBasis", () => {
  it("multiplies quantity by average cost price", () => {
    expect(costBasis(baseHolding)).toBe(1000);
  });
});

describe("currentValue", () => {
  it("falls back to cost basis when no current price is set", () => {
    expect(currentValue(baseHolding)).toBe(1000);
  });

  it("uses the current price once set", () => {
    expect(currentValue({ ...baseHolding, currentPrice: 120 })).toBe(1200);
  });
});

describe("unrealizedPnl", () => {
  it("returns null when no current price is set", () => {
    expect(unrealizedPnl(baseHolding)).toBeNull();
  });

  it("computes a gain", () => {
    expect(unrealizedPnl({ ...baseHolding, currentPrice: 120 })).toBe(200); // (120-100)*10
  });

  it("computes a loss", () => {
    expect(unrealizedPnl({ ...baseHolding, currentPrice: 90 })).toBe(-100); // (90-100)*10
  });
});

describe("unrealizedPnlPercent", () => {
  it("returns null when no current price is set", () => {
    expect(unrealizedPnlPercent(baseHolding)).toBeNull();
  });

  it("computes a percent gain", () => {
    expect(unrealizedPnlPercent({ ...baseHolding, currentPrice: 120 })).toBe(20);
  });

  it("returns null for a zero-cost-basis holding to avoid a divide-by-zero", () => {
    expect(unrealizedPnlPercent({ ...baseHolding, avgCostPrice: 0, currentPrice: 50 })).toBeNull();
  });
});

describe("valuateHolding", () => {
  it("returns all four values together", () => {
    expect(valuateHolding({ ...baseHolding, currentPrice: 120 })).toEqual({
      costBasis: 1000,
      currentValue: 1200,
      unrealizedPnl: 200,
      unrealizedPnlPercent: 20,
    });
  });

  it("returns null P/L fields with cost-basis-equal current value when unpriced", () => {
    expect(valuateHolding(baseHolding)).toEqual({
      costBasis: 1000,
      currentValue: 1000,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
    });
  });
});
