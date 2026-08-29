import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { useTradingStats } from "@/features/trading/hooks/useTradingStats";

import TradingSummaryGrid from "@/features/trading/components/TradingSummaryGrid";
import RiskLimitPanel from "@/features/trading/components/RiskLimitPanel";
import StrategyInsights from "@/features/trading/components/StrategyInsights";
import StrategyComparisonTable from "@/features/trading/components/StrategyComparisonTable";
import EquityCurveChart from "@/features/trading/components/EquityCurveChart";
import DrawdownChart from "@/features/trading/components/DrawdownChart";
import DailyPnlChart from "@/features/trading/components/DailyPnlChart";
import RiskDistributionChart from "@/features/trading/components/RiskDistributionChart";
import SessionAnalysisPanel from "@/features/trading/components/SessionAnalysisPanel";
import PerformanceCalendar from "@/features/trading/components/PerformanceCalendar";
import TradingQuickActions from "@/features/trading/components/TradingQuickActions";
import UpcomingEconomicEvents from "@/features/trading/components/UpcomingEconomicEvents";
import TradeTable from "@/features/trading/components/TradeTable";
import TradingWorkspaceHeader from "@/features/trading/components/TradingWorkspaceHeader";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function TradingDashboard() {
  const navigate = useNavigate();
  const { trades, loading, error, loadTrades } = useTradeStore();
  const { openTradeDrawer } = useTradingUIStore();
  const stats = useTradingStats();
  const { t } = useTranslation();

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const recentTrades = [...trades]
    .sort((a, b) => (b.entryDate ?? "").localeCompare(a.entryDate ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <TradingWorkspaceHeader
        title={t("trading.dashboardTitle")}
        tradeCount={trades.length}
        totalPnl={stats.totalPnl}
        onAddTrade={() => openTradeDrawer()}
      />

      {error ? (
        <ErrorState message={error} onRetry={loadTrades} />
      ) : loading && trades.length === 0 ? (
        <LoadingState label={t("trading.loadingData")} />
      ) : (
        <>
          <RiskLimitPanel todayPnl={stats.todayPnl} weeklyPnl={stats.weeklyPnl} />

          <TradingSummaryGrid
            todayPnl={stats.todayPnl}
            weeklyPnl={stats.weeklyPnl}
            monthlyPnl={stats.monthlyPnl}
            winRate={stats.winRate}
            profitFactor={stats.profitFactor}
            averageRR={stats.averageRR}
            maxDrawdown={stats.maxDrawdown}
            openPositions={stats.openPositions}
            expectancy={stats.expectancy}
            averageHoldingMinutes={stats.averageHoldingMinutes}
          />

          <section id="analytics" className="scroll-mt-24 space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                {t("trading.analyticsTab")}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{t("trading.performanceAnalysis")}</h2>
            </div>

            <StrategyInsights
              bestStrategy={stats.bestStrategy}
              worstStrategy={stats.worstStrategy}
            />

            <StrategyComparisonTable />

            <div className="grid gap-6 xl:grid-cols-2">
              <EquityCurveChart />
              <DrawdownChart />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DailyPnlChart />
              <RiskDistributionChart />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <SessionAnalysisPanel />
              <PerformanceCalendar />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <h2 className="mb-4 text-xl font-semibold">{t("trading.recentTrades")}</h2>
              <TradeTable trades={recentTrades} />
            </div>

            <div className="space-y-6">
              <TradingQuickActions
                onAddTrade={() => openTradeDrawer()}
                onViewJournal={() => navigate("/trading/journal")}
              />
              <UpcomingEconomicEvents />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
