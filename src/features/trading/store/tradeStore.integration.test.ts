import { describe, expect, it, beforeEach } from "vitest";

import { useTradeStore } from "./tradeStore";
import { db } from "@/database/db";

describe("tradeStore (Dexie integration)", () => {
  beforeEach(async () => {
    await db.trades.clear();
    useTradeStore.setState({ trades: [], loading: false, error: null });
  });

  it("loadTrades reads from the database", async () => {
    await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 100,
      quantity: 10,
      entryDate: "2026-07-21",
    });

    await useTradeStore.getState().loadTrades();

    expect(useTradeStore.getState().trades).toHaveLength(1);
    expect(useTradeStore.getState().trades[0].symbol).toBe("AAPL");
  });

  it("addTrade persists to the database and updates state", async () => {
    await useTradeStore.getState().addTrade({
      symbol: "MSFT",
      market: "stocks",
      direction: "short",
      status: "open",
      entryPrice: 300,
      quantity: 5,
      entryDate: "2026-07-21",
    });

    expect(useTradeStore.getState().trades).toHaveLength(1);
    expect((await db.trades.toArray())[0].symbol).toBe("MSFT");
  });

  it("updateTrade modifies an existing record (e.g. closing an open trade)", async () => {
    const id = await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 100,
      quantity: 10,
      entryDate: "2026-07-21",
    });

    await useTradeStore.getState().updateTrade(id, {
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "closed",
      entryPrice: 100,
      exitPrice: 110,
      quantity: 10,
      entryDate: "2026-07-21",
      exitDate: "2026-07-22",
    });

    const updated = await db.trades.get(id);
    expect(updated?.status).toBe("closed");
    expect(updated?.exitPrice).toBe(110);
  });

  it("deleteTrade removes the record", async () => {
    const id = await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "open",
      entryPrice: 100,
      quantity: 10,
      entryDate: "2026-07-21",
    });

    await useTradeStore.getState().loadTrades();
    await useTradeStore.getState().deleteTrade(id);

    expect(useTradeStore.getState().trades).toHaveLength(0);
    expect(await db.trades.get(id)).toBeUndefined();
  });
});
