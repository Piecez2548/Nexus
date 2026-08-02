import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Target } from "lucide-react";

import { useGoalStore } from "@/features/finance/store/goalStore";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";

export default function GoalsPreviewPanel() {
  const { goals, loadGoals } = useGoalStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const preview = goals.slice(0, 4);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("dashboard.goals")}</h2>

        <Link
          to="/goals"
          className="flex items-center gap-1 text-sm text-brand-500 hover:underline"
        >
          <Target size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {preview.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">
          {t("goals.emptyState")}
        </div>
      ) : (
        <div className="space-y-4">
          {preview.map((goal) => {
            const percentage = goal.targetAmount > 0
              ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
              : 0;
            const isComplete = goal.currentAmount >= goal.targetAmount;

            return (
              <div key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-zinc-600 dark:text-zinc-500">
                    ฿{goal.currentAmount.toLocaleString()} / ฿{goal.targetAmount.toLocaleString()}
                  </span>
                </div>

                <ProgressBar
                  percentage={percentage}
                  colorClass={isComplete ? "bg-green-500" : "bg-brand-600"}
                />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
