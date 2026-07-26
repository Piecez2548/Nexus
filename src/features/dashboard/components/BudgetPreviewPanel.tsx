import { Link } from "react-router-dom";
import { PiggyBank } from "lucide-react";

import { useBudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";
import type { BudgetProgress } from "@/features/finance/hooks/useBudgetProgress";

const STATUS_COLOR: Record<BudgetProgress["status"], string> = {
  ok: "bg-green-500",
  near: "bg-amber-500",
  over: "bg-red-500",
};

export default function BudgetPreviewPanel() {
  const progressList = useBudgetProgress();
  const preview = progressList.slice(0, 4);
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("dashboard.budget")}</h2>

        <Link
          to="/budget"
          className="flex items-center gap-1 text-sm text-brand-500 hover:underline"
        >
          <PiggyBank size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {preview.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">
          {t("budget.emptyState")}
        </div>
      ) : (
        <div className="space-y-4">
          {preview.map((progress) => (
            <div key={progress.budget.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{progress.budget.category}</span>
                <span className="text-zinc-600 dark:text-zinc-500">
                  ฿{progress.spent.toLocaleString()} / ฿{progress.budget.amount.toLocaleString()}
                </span>
              </div>

              <ProgressBar
                percentage={progress.percentage}
                colorClass={STATUS_COLOR[progress.status]}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
