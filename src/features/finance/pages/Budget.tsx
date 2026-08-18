import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useBudgetPeriodSnapshotStore } from "@/features/finance/store/budgetPeriodSnapshotStore";
import { useBudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import type { BudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import { recordBudgetProgress } from "@/features/finance/services/budgetTrackingService";
import BudgetTable from "@/features/finance/components/BudgetTable";
import BudgetForm from "@/features/finance/components/BudgetForm";
import BudgetHistoryTable from "@/features/finance/components/BudgetHistoryTable";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Budget as BudgetType } from "@/features/finance/types";

export default function Budget() {
  const { budgets, loading, error, loadBudgets } = useBudgetStore();
  const { loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { loadSnapshots } = useBudgetPeriodSnapshotStore();
  const progressList = useBudgetProgress();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetType | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadBudgets();
    loadTransactions();
    loadCategories();
    loadSnapshots();
  }, [loadBudgets, loadTransactions, loadCategories, loadSnapshots]);

  // Records/upserts this period's snapshot (and fires a toast on a genuine
  // ok/near/over escalation) whenever computed spend changes -- budget
  // spend changes on any relevant transaction change, not just a budget
  // mutation, so this can't hook into budgetStore's own actions.
  useEffect(() => {
    if (progressList.length > 0) void recordBudgetProgress(progressList);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recordBudgetProgress is a stable module-level function
  }, [progressList]);

  function handleAdd() {
    setSelectedBudget(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(progress: BudgetProgress) {
    setSelectedBudget(progress.budget);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedBudget(null);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("budget.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("budget.addBudget")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadBudgets} />
      ) : loading && budgets.length === 0 ? (
        <LoadingState label={t("budget.loading")} />
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("budget.emptyState")}
        </div>
      ) : (
        <BudgetTable progressList={progressList} onEdit={handleEdit} />
      )}

      <BudgetHistoryTable />

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <BudgetForm budget={selectedBudget} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
