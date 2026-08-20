import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useTradingStats } from "./useTradingStats";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { toLocalDateString } from "@/utils/localDate";
import type { Trade } from "@/features/trading/types";

function seed(trades: Trade[]) {
  useTradeStore.setState({ trades });
}

function todayIso() {
  return toLocalDateString(new Date());
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

  it("leaves periodPnl/periodWinRate null when no periodRange is given", () => {
    const { result } = renderHook(() => useTradingStats());

    expect(result.current.periodPnl).toBeNull();
    expect(result.current.periodWinRate).toBeNull();
  });

  it("computes periodPnl/periodWinRate only from trades exiting within the given range", () => {
    seed([
      // Inside the period: winner +100
      {
        symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 110, quantity: 10,
        entryDate: "2026-07-01", exitDate: "2026-07-05",
      },
      // Outside the period: loser -999, must not affect the period figures
      {
        symbol: "MSFT", market: "stocks", direction: "long", status: "closed",
        entryPrice: 100, exitPrice: 1, quantity: 999,
        entryDate: "2026-06-01", exitDate: "2026-06-01",
      },
    ]);

    const range = { start: new Date(2026, 6, 1), end: new Date(2026, 7, 1) }; // July 2026
    const { result } = renderHook(() => useTradingStats(range));

    expect(result.current.periodPnl).toBe(100);
    expect(result.current.periodWinRate).toBe(100);
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

  // Regression: weeklyPnl/monthlyPnl used to parse trade.exitDate via
  // `new Date("YYYY-MM-DD")`, which parses as UTC midnight -- in any
  // non-UTC-positive timezone (this suite runs in Asia/Bangkok, UTC+7),
  // that's *earlier* than the locally-constructed cutoff, so a trade that
  // exited exactly on the boundary day was silently excluded.
  describe("weeklyPnl/monthlyPnl timezone-safe boundary handling (P2 finding)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("includes a trade that exited exactly 7 days ago in weeklyPnl", () => {
      // "Now" pinned late in the local day -- this is exactly where the old
      // UTC-midnight-parsed comparison drifted the farthest.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 20, 23, 0, 0)); // Aug 20 2026, 23:00 local

      seed([
        {
          symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
          entryPrice: 100, exitPrice: 150, quantity: 1,
          entryDate: "2026-08-13", exitDate: "2026-08-13", // exactly 7 days before "today"
        },
      ]);

      const { result } = renderHook(() => useTradingStats());
      expect(result.current.weeklyPnl).toBe(50);
    });

    it("includes a trade that exited exactly 30 days ago in monthlyPnl", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 20, 23, 0, 0)); // Aug 20 2026, 23:00 local

      seed([
        {
          symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
          entryPrice: 100, exitPrice: 175, quantity: 1,
          entryDate: "2026-07-21", exitDate: "2026-07-21", // exactly 30 days before "today"
        },
      ]);

      const { result } = renderHook(() => useTradingStats());
      expect(result.current.monthlyPnl).toBe(75);
    });

    it("excludes a trade that exited 8 days ago from weeklyPnl", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 7, 20, 23, 0, 0));

      seed([
        {
          symbol: "AAPL", market: "stocks", direction: "long", status: "closed",
          entryPrice: 100, exitPrice: 999, quantity: 1,
          entryDate: "2026-08-12", exitDate: "2026-08-12", // 8 days before "today"
        },
      ]);

      const { result } = renderHook(() => useTradingStats());
      expect(result.current.weeklyPnl).toBe(0);
    });
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
