import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useGoalStore } from "@/features/finance/store/goalStore";
import GoalCard from "@/features/finance/components/GoalCard";
import GoalForm from "@/features/finance/components/GoalForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Goal } from "@/features/finance/types";

export default function Goals() {
  const { goals, loading, error, loadGoals } = useGoalStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  function handleAdd() {
    setSelectedGoal(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(goal: Goal) {
    setSelectedGoal(goal);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedGoal(null);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("goals.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          {t("goals.addGoal")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadGoals} />
      ) : loading && goals.length === 0 ? (
        <LoadingState label={t("goals.loading")} />
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("goals.emptyState")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={() => handleEdit(goal)} />
          ))}
        </div>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <GoalForm goal={selectedGoal} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
