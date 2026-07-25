import { describe, expect, it, vi, beforeEach } from "vitest";
import { useTradeStore } from "./tradeStore";
import { tradeService } from "../services/tradeService";
import { useGamificationStore } from "@/store/gamificationStore";
import { db } from "@/database/db";

describe("tradeStore error handling", () => {
  beforeEach(() => {
    useTradeStore.setState({ trades: [], loading: false, error: null });
    vi.restoreAllMocks();
  });

  it("sets an error and stops loading when loadTrades fails", async () => {
    vi.spyOn(tradeService, "list").mockRejectedValueOnce(new Error("DB unavailable"));

    await useTradeStore.getState().loadTrades();

    expect(useTradeStore.getState().loading).toBe(false);
    expect(useTradeStore.getState().error).toBe("DB unavailable");
  });

  it("clears the error once a retry succeeds", async () => {
    vi.spyOn(tradeService, "list")
      .mockRejectedValueOnce(new Error("DB unavailable"))
      .mockResolvedValueOnce([]);

    await useTradeStore.getState().loadTrades();
    expect(useTradeStore.getState().error).toBe("DB unavailable");

    await useTradeStore.getState().loadTrades();
    expect(useTradeStore.getState().error).toBeNull();
  });

  it("addTrade rethrows on failure without touching the shared list-load error", async () => {
    vi.spyOn(tradeService, "create").mockRejectedValueOnce(new Error("Write failed"));

    await expect(
      useTradeStore.getState().addTrade({
        symbol: "AAPL",
        market: "stocks",
        direction: "long",
        status: "open",
        entryPrice: 100,
        quantity: 10,
        entryDate: "2026-07-21",
      })
    ).rejects.toThrow("Write failed");

    expect(useTradeStore.getState().error).toBeNull();
  });
});

describe("tradeStore gamification", () => {
  beforeEach(async () => {
    await db.trades.clear();
    useTradeStore.setState({ trades: [], loading: false, error: null });
    useGamificationStore.setState({ xp: 0, streak: 0, lastActiveDate: null });
  });

  it("awards win xp for a trade added already closed with a profit", async () => {
    await useTradeStore.getState().addTrade({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "closed",
      entryPrice: 100,
      exitPrice: 120,
      quantity: 10,
      entryDate: "2026-07-21",
      exitDate: "2026-07-21",
    });

    expect(useGamificationStore.getState().xp).toBe(20);
  });

  it("awards loss xp for a trade added already closed at a loss", async () => {
    await useTradeStore.getState().addTrade({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "closed",
      entryPrice: 100,
      exitPrice: 90,
      quantity: 10,
      entryDate: "2026-07-21",
      exitDate: "2026-07-21",
    });

    expect(useGamificationStore.getState().xp).toBe(10);
  });

  it("does not award xp again when updating a trade that was already closed", async () => {
    const id = await db.trades.add({
      symbol: "AAPL",
      market: "stocks",
      direction: "long",
      status: "closed",
      entryPrice: 100,
      exitPrice: 120,
      quantity: 10,
      entryDate: "2026-07-21",
      exitDate: "2026-07-21",
    });
    useTradeStore.setState({
      trades: [{
        id, symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 120, quantity: 10, entryDate: "2026-07-21", exitDate: "2026-07-21",
      }],
    });

    await useTradeStore.getState().updateTrade(id, {
      id, symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
      entryPrice: 100, exitPrice: 120, quantity: 10, entryDate: "2026-07-21", exitDate: "2026-07-21",
      strategy: "Breakout",
    });

    expect(useGamificationStore.getState().xp).toBe(0);
  });

  it("awards xp when an open trade transitions to closed via an update", async () => {
    const id = await db.trades.add({
      symbol: "AAPL", market: "stocks", direction: "long", status: "open",
      entryPrice: 100, quantity: 10, entryDate: "2026-07-21",
    });
    useTradeStore.setState({
      trades: [{ id, symbol: "AAPL", market: "stocks", direction: "long", status: "open", entryPrice: 100, quantity: 10, entryDate: "2026-07-21" }],
    });

    await useTradeStore.getState().updateTrade(id, {
      id, symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
      entryPrice: 100, exitPrice: 120, quantity: 10, entryDate: "2026-07-21", exitDate: "2026-07-21",
    });

    expect(useGamificationStore.getState().xp).toBe(20);
  });
});
