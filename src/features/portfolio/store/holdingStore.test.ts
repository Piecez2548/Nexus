import { describe, expect, it, beforeEach } from "vitest";
import { useHoldingStore } from "./holdingStore";
import { db } from "@/database/db";
import type { Holding } from "@/features/portfolio/types";

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

describe("holdingStore", () => {
  beforeEach(async () => {
    await db.holdings.clear();
    useHoldingStore.setState({ holdings: [], loading: false, error: null });
  });

  it("updateCurrentPrice sets the price and a timestamp", async () => {
    const id = await db.holdings.add(sample());
    useHoldingStore.setState({ holdings: [sample({ id })] });

    await useHoldingStore.getState().updateCurrentPrice(id, 120);

    const [holding] = useHoldingStore.getState().holdings;
    expect(holding.currentPrice).toBe(120);
    expect(holding.currentPriceUpdatedAt).toBeTruthy();
  });

  it("overwrites a previously-set price cleanly on a later update", async () => {
    const id = await db.holdings.add(sample({ currentPrice: 110 }));
    useHoldingStore.setState({ holdings: [sample({ id, currentPrice: 110 })] });

    await useHoldingStore.getState().updateCurrentPrice(id, 130);

    const [holding] = useHoldingStore.getState().holdings;
    expect(holding.currentPrice).toBe(130);
  });

  it("is a no-op when the holding id isn't found in state", async () => {
    await useHoldingStore.getState().updateCurrentPrice(999, 100);
    expect(useHoldingStore.getState().holdings).toHaveLength(0);
  });
});
