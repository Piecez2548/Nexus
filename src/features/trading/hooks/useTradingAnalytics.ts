import { useMemo } from "react";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { calculatePnl } from "@/features/trading/utils/pnl";
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

const RISK_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "< -2R", min: -Infinity, max: -2 },
  { label: "-2R to -1R", min: -2, max: -1 },
  { label: "-1R to 0R", min: -1, max: 0 },
  { label: "0R to 1R", min: 0, max: 1 },
  { label: "1R to 2R", min: 1, max: 2 },
  { label: "> 2R", min: 2, max: Infinity },
];

// Realized R-multiple: PnL expressed as a multiple of the dollar amount
// that was actually at risk (based on the stop-loss distance). Distinct
// from pnl.ts's calculateRR, which is the *planned* reward:risk ratio of
// the setup rather than the realized outcome.
function realizedRMultiple(trade: Trade): number | null {
  if (trade.stopLoss === undefined) return null;

  const riskPerUnit = Math.abs(trade.entryPrice - trade.stopLoss);
  if (riskPerUnit === 0) return null;

  const pnl = calculatePnl(trade);
  if (pnl === null) return null;

  const riskAmount = riskPerUnit * trade.quantity;
  if (riskAmount === 0) return null;

  return pnl / riskAmount;
}

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
        const r = realizedRMultiple(t);
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

    return { equityCurve, dailyPnl, riskDistribution, sessionStats };
  }, [trades]);
}
