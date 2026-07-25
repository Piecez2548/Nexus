import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useTradingStats } from "./useTradingStats";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import type { Trade } from "@/features/trading/types";

function seed(trades: Trade[]) {
  useTradeStore.setState({ trades });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

describe("useTradingStats", () => {
  beforeEach(() => {
    useTradeStore.setState({ trades: [] });
  });

  it("returns zeroed stats with no trades", () => {
    const { result } = renderHook(() => useTradingStats());

    expect(result.current.winRate).toBe(0);
    expect(result.current.profitFactor).toBe(0);
    expect(result.current.averageRR).toBe(0);
    expect(result.current.openPositions).toBe(0);
    expect(result.current.totalClosedTrades).toBe(0);
    expect(result.current.bestStrategy).toBeNull();
  });

  it("counts open positions separately from closed trades", () => {
    seed([
      {
        symbol: "AAPL", market: "stocks", direction: "long", status: "open",
        entryPrice: 100, quantity: 10, entryDate: todayIso(),
      },
      {
        symbol: "MSFT", market: "stocks", direction: "long", status: "open",
        entryPrice: 200, quantity: 5, entryDate: todayIso(),
      },
    ]);

    const { result } = renderHook(() => useTradingStats());
    expect(result.current.openPositions).toBe(2);
    expect(result.current.totalClosedTrades).toBe(0);
  });

  it("computes win rate and profit factor from closed trades", () => {
    seed([
      // Winner: +100
      {
        symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 110, quantity: 10,
        entryDate: todayIso(), exitDate: todayIso(),
      },
      // Loser: -50
      {
        symbol: "MSFT", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 95, quantity: 10,
        entryDate: todayIso(), exitDate: todayIso(),
      },
    ]);

    const { result } = renderHook(() => useTradingStats());
    expect(result.current.winRate).toBe(50);
    expect(result.current.profitFactor).toBeCloseTo(100 / 50);
    expect(result.current.todayPnl).toBe(50); // 100 - 50
  });

  it("picks the best and worst strategy by total P/L", () => {
    seed([
      {
        symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 120, quantity: 10, strategy: "Breakout",
        entryDate: todayIso(), exitDate: todayIso(),
      },
      {
        symbol: "MSFT", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 80, quantity: 10, strategy: "Reversal",
        entryDate: todayIso(), exitDate: todayIso(),
      },
    ]);

    const { result } = renderHook(() => useTradingStats());
    expect(result.current.bestStrategy).toBe("Breakout");
    expect(result.current.worstStrategy).toBe("Reversal");
  });

  it("computes max drawdown across a losing streak", () => {
    seed([
      // +200 then -300 then +50 -> peak 200, trough -100, drawdown 300
      {
        symbol: "A", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 120, quantity: 10,
        entryDate: "2026-07-01", exitDate: "2026-07-01",
      },
      {
        symbol: "B", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 70, quantity: 10,
        entryDate: "2026-07-02", exitDate: "2026-07-02",
      },
      {
        symbol: "C", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 105, quantity: 10,
        entryDate: "2026-07-03", exitDate: "2026-07-03",
      },
    ]);

    const { result } = renderHook(() => useTradingStats());
    expect(result.current.maxDrawdown).toBe(300);
  });
});
