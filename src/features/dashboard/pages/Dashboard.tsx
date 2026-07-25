import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import SummaryCardsGrid from "@/features/dashboard/components/SummaryCardsGrid";
import CashFlowSection from "@/features/dashboard/components/CashFlowSection";
import RecentTransactionsList from "@/features/dashboard/components/RecentTransactionsList";
import QuickActions from "@/features/dashboard/components/QuickActions";
import BudgetPreviewPanel from "@/features/dashboard/components/BudgetPreviewPanel";
import TradingOverviewPanel from "@/features/dashboard/components/TradingOverviewPanel";
import TodoPreviewPanel from "@/features/dashboard/components/TodoPreviewPanel";
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
import { useSpendingInsights } from "@/features/finance/hooks/useSpendingInsights";
import { useTranslation } from "@/i18n/useTranslation";

export default function Dashboard() {
  const navigate = useNavigate();

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

  const {
    balance,
    income,
    expense,
    saving,
    changes,
  } = useDashboard();

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
          />

          <CashFlowSection />

          <InsightsPanel insights={insights} />

          <LifeModulesSection />

          <div className="grid gap-6 xl:grid-cols-3">
            <RecentTransactionsList transactions={transactions} />

            <div className="space-y-6">
              <QuickActions
                onAddTransaction={() => openTransactionDrawer()}
                onViewTransactions={() => navigate("/transactions")}
              />

              <TodoPreviewPanel />

              <TradingOverviewPanel />

              <BudgetPreviewPanel />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
