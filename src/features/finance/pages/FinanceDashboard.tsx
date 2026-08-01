import { useEffect } from "react";

import SummaryCardsGrid from "@/features/dashboard/components/SummaryCardsGrid";
import CashFlowSection from "@/features/dashboard/components/CashFlowSection";
import MonthlyOverviewPanel from "@/features/dashboard/components/MonthlyOverviewPanel";
import BudgetPreviewPanel from "@/features/dashboard/components/BudgetPreviewPanel";
import GoalsPreviewPanel from "@/features/dashboard/components/GoalsPreviewPanel";
import RecentTransactionsList from "@/features/dashboard/components/RecentTransactionsList";
import SubscriptionsSummaryPanel from "@/features/finance/components/SubscriptionsSummaryPanel";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useTranslation } from "@/i18n/useTranslation";

export default function FinanceDashboard() {
  const { loadTransactions, transactions, loading, error } = useTransactionStore();
  const { loadBudgets } = useBudgetStore();
  const { loadCategories } = useCategoryStore();
  const { t } = useTranslation();

  const { balance, income, expense, saving, changes, monthly } = useDashboard();

  useEffect(() => {
    loadTransactions();
    loadBudgets();
    loadCategories();
  }, [loadTransactions, loadBudgets, loadCategories]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("financeDashboard.pageTitle")}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-500">
          {t("financeDashboard.pageSubtitle")}
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadTransactions} />
      ) : loading && transactions.length === 0 ? (
        <LoadingState label={t("financeDashboard.loading")} />
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

          <div className="grid gap-6 xl:grid-cols-2">
            <MonthlyOverviewPanel monthly={monthly} changes={changes} />
            <SubscriptionsSummaryPanel />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <BudgetPreviewPanel />
            <GoalsPreviewPanel />
          </div>

          <RecentTransactionsList transactions={transactions} />
        </>
      )}
    </div>
  );
}
