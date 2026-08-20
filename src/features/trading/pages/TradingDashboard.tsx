import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { useTradingStats } from "@/features/trading/hooks/useTradingStats";

import TradingSummaryGrid from "@/features/trading/components/TradingSummaryGrid";
import RiskLimitPanel from "@/features/trading/components/RiskLimitPanel";
import StrategyInsights from "@/features/trading/components/StrategyInsights";
import EquityCurveChart from "@/features/trading/components/EquityCurveChart";
import DrawdownChart from "@/features/trading/components/DrawdownChart";
import DailyPnlChart from "@/features/trading/components/DailyPnlChart";
import RiskDistributionChart from "@/features/trading/components/RiskDistributionChart";
import SessionAnalysisPanel from "@/features/trading/components/SessionAnalysisPanel";
import PerformanceCalendar from "@/features/trading/components/PerformanceCalendar";
import TradingQuickActions from "@/features/trading/components/TradingQuickActions";
import TradeTable from "@/features/trading/components/TradeTable";
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

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("trading.dashboardTitle")}</h1>

        <button
          onClick={() => openTradeDrawer()}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-medium transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("trading.addTrade")}
        </button>
      </div>

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
          />

          <StrategyInsights
            bestStrategy={stats.bestStrategy}
            worstStrategy={stats.worstStrategy}
          />

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

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <h2 className="mb-4 text-xl font-semibold">{t("trading.recentTrades")}</h2>
              <TradeTable trades={recentTrades} />
            </div>

            <TradingQuickActions
              onAddTrade={() => openTradeDrawer()}
              onViewJournal={() => navigate("/trading/journal")}
            />
          </div>
        </>
      )}

    </div>
  );
}
