import { Link } from "react-router-dom";
import { Target } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveGoalSnapshot } from "@/features/executive/types";

interface Props {
  goals: ExecutiveGoalSnapshot[];
}

const MAX_SHOWN = 4;

export default function GoalsSnapshotSection({ goals }: Props) {
  const { t } = useTranslation();
  const shown = goals.slice(0, MAX_SHOWN);
  const atRiskCount = goals.filter((g) => g.isAtRisk).length;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("executive.goals.title")}</h2>
        <Link to="/goals" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          <Target size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("executive.goals.empty")}</div>
      ) : (
        <div className="space-y-4">
          {atRiskCount > 0 && (
            <p className="text-xs font-semibold text-red-500">{t("executive.goals.atRiskCount", { count: atRiskCount })}</p>
          )}

          {shown.map((entry) => (
            <div key={entry.goal.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate font-medium">{entry.goal.name}</span>
                <span className={`shrink-0 ${entry.isAtRisk ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {entry.progressPercent.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-1.5 rounded-full ${entry.isAtRisk ? "bg-red-500" : entry.isComplete ? "bg-green-500" : "bg-brand-500"}`}
                  style={{ width: `${Math.min(100, entry.progressPercent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
