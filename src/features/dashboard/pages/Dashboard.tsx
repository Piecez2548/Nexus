import { useEffect } from "react";

import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import DashboardPeriodSelector from "@/features/dashboard/components/DashboardPeriodSelector";
import SummaryCardsGrid from "@/features/dashboard/components/SummaryCardsGrid";
import CashFlowSection from "@/features/dashboard/components/CashFlowSection";
import RecentTransactionsList from "@/features/dashboard/components/RecentTransactionsList";
import BudgetPreviewPanel from "@/features/dashboard/components/BudgetPreviewPanel";
import TradingOverviewPanel from "@/features/dashboard/components/TradingOverviewPanel";
import PortfolioOverviewPanel from "@/features/dashboard/components/PortfolioOverviewPanel";
import TodoPreviewPanel from "@/features/dashboard/components/TodoPreviewPanel";
import HabitPreviewPanel from "@/features/dashboard/components/HabitPreviewPanel";
import SchedulePreviewPanel from "@/features/dashboard/components/SchedulePreviewPanel";
import AiDailySummaryPanel from "@/features/dashboard/components/AiDailySummaryPanel";
import InsightsPanel from "@/features/finance/components/InsightsPanel";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useUIStore } from "@/features/finance/store/uiStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useDashboardPeriodStore } from "@/features/dashboard/store/dashboardPeriodStore";
import { useSpendingInsights } from "@/features/finance/hooks/useSpendingInsights";
import { useTranslation } from "@/i18n/useTranslation";

export default function Dashboard() {
  const {
    loadTransactions,
    transactions,
    loading,
    error,
  } = useTransactionStore();

  const { openTransactionDrawer } = useUIStore();
  const { loadBudgets } = useBudgetStore();
  const { loadCategories } = useCategoryStore();
  const { loadTrades } = useTradeStore();
  const { granularity } = useDashboardPeriodStore();

  const {
    balance,
    income,
    expense,
    saving,
    changes,
  } = useDashboard(new Date(), granularity);

  const insights = useSpendingInsights();
  const { t } = useTranslation();

  useEffect(() => {
    loadTransactions();
    loadBudgets();
    loadCategories();
    loadTrades();
  }, [loadTransactions, loadBudgets, loadCategories, loadTrades]);

  return (
    <div className="space-y-8">

      <DashboardHeader onAddTransaction={() => openTransactionDrawer()} />

      <DashboardPeriodSelector />

      {error ? (
        <ErrorState message={error} onRetry={loadTransactions} />
      ) : loading && transactions.length === 0 ? (
        <LoadingState label={t("dashboard.loadingDashboard")} />
      ) : (
        <>
          <SummaryCardsGrid
            balance={balance}
            income={income}
            expense={expense}
            saving={saving}
            changes={changes}
            granularity={granularity}
          />

          <CashFlowSection granularity={granularity} />

          {/* Capped so a burst of insight rules firing at once (e.g. several
              categories over budget the same month) can't make this section
              grow unbounded — kept short, not a dominant section, per
              explicit feedback that it was pushing everything below it too
              far down. Full-width (not half): a half-width panel left an
              empty gap beside it that read as a layout bug. */}
          <InsightsPanel insights={insights.slice(0, 3)} />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <BudgetPreviewPanel />

            <TodoPreviewPanel />

            <HabitPreviewPanel />

            <SchedulePreviewPanel />

            <TradingOverviewPanel />

            <PortfolioOverviewPanel />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <RecentTransactionsList transactions={transactions} />

            <AiDailySummaryPanel />
          </div>
        </>
      )}

    </div>
  );
}
