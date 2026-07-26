import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { usePortfolioStats } from "./usePortfolioStats";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import type { Holding } from "@/features/portfolio/types";

function seed(holdings: Holding[]) {
  useHoldingStore.setState({ holdings });
}

function sample(overrides: Partial<Holding> = {}): Holding {
  return {
    symbol: "AAPL",
    market: "stocks",
    quantity: 10,
    avgCostPrice: 100,
    createdAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

describe("usePortfolioStats", () => {
  beforeEach(() => {
    useHoldingStore.setState({ holdings: [] });
  });

  it("returns zeroed/null stats with no holdings", () => {
    const { result } = renderHook(() => usePortfolioStats());

    expect(result.current.holdingsCount).toBe(0);
    expect(result.current.pricedHoldingsCount).toBe(0);
    expect(result.current.totalCostBasis).toBe(0);
    expect(result.current.totalCurrentValue).toBe(0);
    expect(result.current.totalUnrealizedPnl).toBeNull();
    expect(result.current.totalUnrealizedPnlPercent).toBeNull();
  });

  it("sums cost basis and current value across fully-priced holdings", () => {
    seed([
      sample({ symbol: "AAPL", quantity: 10, avgCostPrice: 100, currentPrice: 120 }),
      sample({ symbol: "MSFT", quantity: 5, avgCostPrice: 200, currentPrice: 180 }),
    ]);

    const { result } = renderHook(() => usePortfolioStats());

    expect(result.current.holdingsCount).toBe(2);
    expect(result.current.pricedHoldingsCount).toBe(2);
    expect(result.current.totalCostBasis).toBe(2000); // 10*100 + 5*200
    expect(result.current.totalCurrentValue).toBe(2100); // 10*120 + 5*180
    expect(result.current.totalUnrealizedPnl).toBe(100); // 200 gain - 100 loss
  });

  it("returns null total P/L when none of the holdings have a price yet", () => {
    seed([sample(), sample({ symbol: "MSFT" })]);

    const { result } = renderHook(() => usePortfolioStats());

    expect(result.current.pricedHoldingsCount).toBe(0);
    expect(result.current.totalUnrealizedPnl).toBeNull();
    // Cost basis / current value are still real numbers, just equal, since
    // an unpriced holding's current value falls back to its cost basis.
    expect(result.current.totalCostBasis).toBe(result.current.totalCurrentValue);
  });

  it("computes a partial sum when only some holdings are priced", () => {
    seed([
      sample({ symbol: "AAPL", quantity: 10, avgCostPrice: 100, currentPrice: 120 }), // +200, priced
      sample({ symbol: "MSFT", quantity: 5, avgCostPrice: 200 }), // unpriced
    ]);

    const { result } = renderHook(() => usePortfolioStats());

    expect(result.current.holdingsCount).toBe(2);
    expect(result.current.pricedHoldingsCount).toBe(1);
    expect(result.current.totalUnrealizedPnl).toBe(200);
  });

  it("computes the partial percent against only the priced holdings' cost basis, not the whole portfolio's", () => {
    seed([
      sample({ symbol: "AAPL", quantity: 10, avgCostPrice: 100, currentPrice: 120 }), // cost 1000, +200 (+20%)
      sample({ symbol: "BTC", market: "crypto", quantity: 1, avgCostPrice: 50000 }), // unpriced, cost 50000
    ]);

    const { result } = renderHook(() => usePortfolioStats());

    // A naive percent-of-total-cost-basis would give (200 / 51000) * 100,
    // a meaningless ~0.4% that doesn't correspond to any real capital.
    expect(result.current.totalUnrealizedPnlPercent).toBe(20);
  });
});
