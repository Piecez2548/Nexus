import { useMemo } from "react";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { calculatePnl, calculateRR } from "@/features/trading/utils/pnl";

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function useTradingStats() {
  const { trades } = useTradeStore();

  return useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === "closed");
    const withPnl = closedTrades.map((trade) => ({
      trade,
      pnl: calculatePnl(trade) ?? 0,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const weekStart = daysAgo(7);
    const monthStart = daysAgo(30);

    const sumPnlSince = (start: Date | null) =>
      withPnl
        .filter(({ trade }) => {
          if (!trade.exitDate) return false;
          if (start === null) return trade.exitDate === today;
          return new Date(trade.exitDate) >= start;
        })
        .reduce((sum, { pnl }) => sum + pnl, 0);

    const todayPnl = sumPnlSince(null);
    const weeklyPnl = sumPnlSince(weekStart);
    const monthlyPnl = sumPnlSince(monthStart);

    const wins = withPnl.filter(({ pnl }) => pnl > 0);
    const losses = withPnl.filter(({ pnl }) => pnl < 0);

    const winRate = withPnl.length > 0 ? (wins.length / withPnl.length) * 100 : 0;

    const grossProfit = wins.reduce((sum, { pnl }) => sum + pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, { pnl }) => sum + pnl, 0));
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const rrValues = closedTrades
      .map(calculateRR)
      .filter((rr): rr is number => rr !== null);
    const averageRR =
      rrValues.length > 0 ? rrValues.reduce((sum, v) => sum + v, 0) / rrValues.length : 0;

    // Max drawdown: largest peak-to-trough drop in cumulative P/L, ordered by exit date.
    const sortedByExit = [...withPnl].sort((a, b) =>
      (a.trade.exitDate ?? "").localeCompare(b.trade.exitDate ?? "")
    );

    let cumulative = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const { pnl } of sortedByExit) {
      cumulative += pnl;
      peak = Math.max(peak, cumulative);
      maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
    }

    const byStrategy = new Map<string, number>();
    for (const { trade, pnl } of withPnl) {
      const key = trade.strategy?.trim() || "Unspecified";
      byStrategy.set(key, (byStrategy.get(key) ?? 0) + pnl);
    }

    const strategyEntries = Array.from(byStrategy.entries());
    const bestStrategy =
      strategyEntries.length > 0
        ? strategyEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
        : null;
    const worstStrategy =
      strategyEntries.length > 0
        ? strategyEntries.reduce((a, b) => (b[1] < a[1] ? b : a))[0]
        : null;

    return {
      todayPnl,
      weeklyPnl,
      monthlyPnl,
      winRate,
      profitFactor,
      averageRR,
      maxDrawdown,
      bestStrategy,
      worstStrategy,
      openPositions: trades.filter((t) => t.status === "open").length,
      totalClosedTrades: closedTrades.length,
    };
  }, [trades]);
}
