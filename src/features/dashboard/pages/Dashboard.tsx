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
import CalendarOverviewPanel from "@/features/dashboard/components/CalendarOverviewPanel";
import LifeModulesSection from "@/features/dashboard/components/LifeModulesSection";
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
              grow unbounded — kept short and half-width, not a dominant
              section, per explicit feedback that it was pushing everything
              below it too far down. */}
          <div className="lg:w-1/2">
            <InsightsPanel insights={insights.slice(0, 3)} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <BudgetPreviewPanel />

            <TodoPreviewPanel />

            <HabitPreviewPanel />

            <CalendarOverviewPanel />

            <TradingOverviewPanel />

            <PortfolioOverviewPanel />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <RecentTransactionsList transactions={transactions} />

            <LifeModulesSection />
          </div>
        </>
      )}

    </div>
  );
}
