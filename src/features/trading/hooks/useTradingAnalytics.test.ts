import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useTradingAnalytics } from "./useTradingAnalytics";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import type { Trade } from "@/features/trading/types";

function seed(trades: Trade[]) {
  useTradeStore.setState({ trades });
}

const baseTrade: Trade = {
  symbol: "AAPL",
  market: "stocks",
  direction: "long",
  status: "closed",
  entryPrice: 100,
  quantity: 10,
  entryDate: "2026-07-01",
};

describe("useTradingAnalytics", () => {
  beforeEach(() => {
    useTradeStore.setState({ trades: [] });
  });

  it("returns empty analytics with no trades", () => {
    const { result } = renderHook(() => useTradingAnalytics());

    expect(result.current.equityCurve).toHaveLength(0);
    expect(result.current.dailyPnl).toHaveLength(0);
    expect(result.current.sessionStats).toHaveLength(0);
    expect(result.current.riskDistribution.every((b) => b.count === 0)).toBe(true);
  });

  it("ignores open trades in the equity curve", () => {
    seed([{ ...baseTrade, status: "open" }]);

    const { result } = renderHook(() => useTradingAnalytics());
    expect(result.current.equityCurve).toHaveLength(0);
  });

  it("builds a cumulative equity curve ordered by exit date", () => {
    seed([
      { ...baseTrade, exitPrice: 110, exitDate: "2026-07-05" }, // +100
      { ...baseTrade, exitPrice: 90, exitDate: "2026-07-03" }, // -100
      { ...baseTrade, exitPrice: 120, exitDate: "2026-07-10" }, // +200
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    const { equityCurve } = result.current;

    expect(equityCurve.map((p) => p.date)).toEqual(["2026-07-03", "2026-07-05", "2026-07-10"]);
    expect(equityCurve[0].equity).toBe(-100);
    expect(equityCurve[1].equity).toBe(0);
    expect(equityCurve[2].equity).toBe(200);
  });

  it("computes drawdown percent from the running peak", () => {
    seed([
      { ...baseTrade, exitPrice: 110, exitDate: "2026-07-01" }, // +100, peak=100
      { ...baseTrade, exitPrice: 95, exitDate: "2026-07-02" }, // -50, cum=50, drawdown = (100-50)/100=50%
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    const { equityCurve } = result.current;

    expect(equityCurve[0].drawdownPercent).toBe(-0);
    expect(equityCurve[1].drawdownPercent).toBeCloseTo(-50, 5);
  });

  it("aggregates daily P/L across multiple trades exiting the same day", () => {
    seed([
      { ...baseTrade, exitPrice: 110, exitDate: "2026-07-05" }, // +100
      { ...baseTrade, exitPrice: 105, exitDate: "2026-07-05" }, // +50
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    expect(result.current.dailyPnl).toEqual([{ date: "2026-07-05", pnl: 150 }]);
  });

  it("buckets trades into risk-distribution R-multiples", () => {
    seed([
      // risk = |100-95|*10 = 50; pnl = (110-100)*10 = 100 -> R = 2 -> falls in "> 2R"? 100/50=2, bucket [2,Infinity) -> "> 2R"
      { ...baseTrade, stopLoss: 95, exitPrice: 110, exitDate: "2026-07-01" },
      // risk = 50; pnl = (90-100)*10 = -100 -> R = -2 -> falls in "-2R to -1R"? -2 is >= -2 and < -1 -> yes
      { ...baseTrade, stopLoss: 95, exitPrice: 90, exitDate: "2026-07-02" },
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    const positive = result.current.riskDistribution.find((b) => b.label === "> 2R");
    const negative = result.current.riskDistribution.find((b) => b.label === "-2R to -1R");

    expect(positive?.count).toBe(1);
    expect(negative?.count).toBe(1);
  });

  it("excludes trades without a stop loss from risk distribution", () => {
    seed([{ ...baseTrade, exitPrice: 110, exitDate: "2026-07-01" }]);

    const { result } = renderHook(() => useTradingAnalytics());
    const totalBucketed = result.current.riskDistribution.reduce((sum, b) => sum + b.count, 0);
    expect(totalBucketed).toBe(0);
  });

  it("computes per-session win rate and total P/L", () => {
    seed([
      { ...baseTrade, session: "london", exitPrice: 110, exitDate: "2026-07-01" }, // win
      { ...baseTrade, session: "london", exitPrice: 90, exitDate: "2026-07-02" }, // loss
      { ...baseTrade, session: "asian", exitPrice: 105, exitDate: "2026-07-03" }, // win
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    const london = result.current.sessionStats.find((s) => s.session === "london")!;
    const asian = result.current.sessionStats.find((s) => s.session === "asian")!;

    expect(london.tradeCount).toBe(2);
    expect(london.winRate).toBe(50);
    expect(london.totalPnl).toBe(0); // +100 - 100

    expect(asian.tradeCount).toBe(1);
    expect(asian.winRate).toBe(100);
    expect(asian.totalPnl).toBe(50);
  });

  it("excludes trades without a session from session stats", () => {
    seed([{ ...baseTrade, exitPrice: 110, exitDate: "2026-07-01" }]);

    const { result } = renderHook(() => useTradingAnalytics());
    expect(result.current.sessionStats).toHaveLength(0);
  });

  it("returns empty strategyComparison with no trades", () => {
    const { result } = renderHook(() => useTradingAnalytics());
    expect(result.current.strategyComparison).toHaveLength(0);
  });

  it("groups closed trades by strategy, computing per-group win rate/pnl/profit factor", () => {
    seed([
      { ...baseTrade, strategy: "Breakout", exitPrice: 110, exitDate: "2026-07-01" }, // +100
      { ...baseTrade, strategy: "Breakout", exitPrice: 90, exitDate: "2026-07-02" }, // -100
      { ...baseTrade, strategy: "Reversal", exitPrice: 120, exitDate: "2026-07-03" }, // +200
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    const breakout = result.current.strategyComparison.find((r) => r.strategy === "Breakout")!;
    const reversal = result.current.strategyComparison.find((r) => r.strategy === "Reversal")!;

    expect(breakout.tradeCount).toBe(2);
    expect(breakout.winRate).toBe(50);
    expect(breakout.totalPnl).toBe(0);
    expect(breakout.profitFactor).toBe(1); // grossProfit 100 / grossLoss 100

    expect(reversal.tradeCount).toBe(1);
    expect(reversal.winRate).toBe(100);
    expect(reversal.totalPnl).toBe(200);
    expect(reversal.profitFactor).toBe(Infinity); // no losses
  });

  it("groups trades with no strategy under 'Unspecified'", () => {
    seed([{ ...baseTrade, exitPrice: 110, exitDate: "2026-07-01" }]);

    const { result } = renderHook(() => useTradingAnalytics());
    expect(result.current.strategyComparison).toEqual([
      expect.objectContaining({ strategy: "Unspecified", tradeCount: 1 }),
    ]);
  });

  it("sorts strategyComparison by totalPnl descending", () => {
    seed([
      { ...baseTrade, strategy: "Low", exitPrice: 105, exitDate: "2026-07-01" }, // +50
      { ...baseTrade, strategy: "High", exitPrice: 150, exitDate: "2026-07-02" }, // +500
    ]);

    const { result } = renderHook(() => useTradingAnalytics());
    expect(result.current.strategyComparison.map((r) => r.strategy)).toEqual(["High", "Low"]);
  });
});
