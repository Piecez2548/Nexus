import { useMemo } from "react";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { calculatePnl, calculateRR, calculateRealizedRMultiple } from "@/features/trading/utils/pnl";
import type { Trade, TradingSession } from "@/features/trading/types";

export interface EquityPoint {
  date: string;
  equity: number;
  drawdownPercent: number;
}

export interface DailyPnl {
  date: string;
  pnl: number;
}

export interface RiskBucket {
  label: string;
  count: number;
  isPositive: boolean;
}

export interface SessionStat {
  session: TradingSession;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
}

export interface StrategyComparisonRow {
  strategy: string;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
  profitFactor: number;
  averageRR: number;
}

const RISK_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "< -2R", min: -Infinity, max: -2 },
  { label: "-2R to -1R", min: -2, max: -1 },
  { label: "-1R to 0R", min: -1, max: 0 },
  { label: "0R to 1R", min: 0, max: 1 },
  { label: "1R to 2R", min: 1, max: 2 },
  { label: "> 2R", min: 2, max: Infinity },
];

function sortByExitDate<T extends { exitDate?: string }>(trades: T[]): T[] {
  return [...trades].sort((a, b) => (a.exitDate ?? "").localeCompare(b.exitDate ?? ""));
}

export function useTradingAnalytics() {
  const { trades } = useTradeStore();

  return useMemo(() => {
    const closedTrades = trades.filter(
      (t): t is Trade & { exitDate: string } => t.status === "closed" && !!t.exitDate
    );
    const sorted = sortByExitDate(closedTrades);

    // Equity curve + drawdown, walked in exit-date order.
    let cumulative = 0;
    let peak = 0;
    const equityCurve: EquityPoint[] = [];

    for (const t of sorted) {
      const pnl = calculatePnl(t) ?? 0;
      cumulative += pnl;
      peak = Math.max(peak, cumulative);
      const drawdownPercent = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      equityCurve.push({ date: t.exitDate, equity: cumulative, drawdownPercent: -drawdownPercent });
    }

    // Daily P/L, aggregated across trades exiting the same day.
    const dailyMap = new Map<string, number>();
    for (const t of sorted) {
      const pnl = calculatePnl(t) ?? 0;
      dailyMap.set(t.exitDate, (dailyMap.get(t.exitDate) ?? 0) + pnl);
    }
    const dailyPnl: DailyPnl[] = Array.from(dailyMap.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Risk distribution: bucket realized R-multiples.
    const riskDistribution: RiskBucket[] = RISK_BUCKETS.map((bucket) => ({
      label: bucket.label,
      isPositive: bucket.min >= 0,
      count: closedTrades.filter((t) => {
        const r = calculateRealizedRMultiple(t);
        return r !== null && r >= bucket.min && r < bucket.max;
      }).length,
    }));

    // Session analysis.
    const bySession = new Map<TradingSession, { wins: number; total: number; pnl: number }>();
    for (const t of closedTrades) {
      if (!t.session) continue;
      const entry = bySession.get(t.session) ?? { wins: 0, total: 0, pnl: 0 };
      const pnl = calculatePnl(t) ?? 0;
      entry.total += 1;
      entry.pnl += pnl;
      if (pnl > 0) entry.wins += 1;
      bySession.set(t.session, entry);
    }
    const sessionStats: SessionStat[] = Array.from(bySession.entries()).map(([session, data]) => ({
      session,
      tradeCount: data.total,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      totalPnl: data.pnl,
    }));

    // Strategy comparison: same "Unspecified" grouping convention
    // useTradingStats.ts's bestStrategy/worstStrategy uses, but keeping the
    // full per-group trade set instead of collapsing straight to a sum, so
    // win rate/profit factor/average RR can also be computed per group.
    const byStrategy = new Map<string, Trade[]>();
    for (const t of closedTrades) {
      const key = t.strategy?.trim() || "Unspecified";
      const list = byStrategy.get(key) ?? [];
      list.push(t);
      byStrategy.set(key, list);
    }

    const strategyComparison: StrategyComparisonRow[] = Array.from(byStrategy.entries())
      .map(([strategy, strategyTrades]) => {
        const pnls = strategyTrades.map((t) => calculatePnl(t) ?? 0);
        const wins = pnls.filter((p) => p > 0);
        const losses = pnls.filter((p) => p < 0);
        const grossProfit = wins.reduce((sum, p) => sum + p, 0);
        const grossLoss = Math.abs(losses.reduce((sum, p) => sum + p, 0));
        const rrValues = strategyTrades.map(calculateRR).filter((rr): rr is number => rr !== null);

        return {
          strategy,
          tradeCount: strategyTrades.length,
          winRate: strategyTrades.length > 0 ? (wins.length / strategyTrades.length) * 100 : 0,
          totalPnl: pnls.reduce((sum, p) => sum + p, 0),
          profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
          averageRR: rrValues.length > 0 ? rrValues.reduce((sum, v) => sum + v, 0) / rrValues.length : 0,
        };
      })
      .sort((a, b) => b.totalPnl - a.totalPnl);

    return { equityCurve, dailyPnl, riskDistribution, sessionStats, strategyComparison };
  }, [trades]);
}
