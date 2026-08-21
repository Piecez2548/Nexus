import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveSummary, ExecutiveWorkloadLevel } from "@/features/executive/types";

interface Props {
  summary: ExecutiveSummary;
}

const WORKLOAD_COLOR: Record<ExecutiveWorkloadLevel, string> = {
  light: "text-green-500",
  moderate: "text-amber-500",
  high: "text-red-500",
};

// Deterministic, rule-based data only -- explicitly labeled "Executive
// Summary", never phrased as "AI says" (EXEC-001 §7: no AI/LLM is involved).
export default function ExecutiveSummaryPanel({ summary }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">{t("executive.summary.title")}</h2>

      <div className="space-y-2 text-sm">
        <p>
          <span className="text-zinc-500 dark:text-zinc-400">{t("executive.summary.workloadLabel")}: </span>
          <span className={`font-semibold ${WORKLOAD_COLOR[summary.workloadLevel]}`}>
            {t(`executive.summary.workload.${summary.workloadLevel}`)}
          </span>
        </p>

        <p>
          <span className="text-zinc-500 dark:text-zinc-400">{t("executive.summary.topPriorityLabel")}: </span>
          <span className="font-medium">{summary.topPriority ? summary.topPriority.title : t("executive.summary.allClear")}</span>
        </p>

        {summary.overdueCount > 0 && (
          <p className="text-red-500">{t("executive.summary.overdueCount", { count: summary.overdueCount })}</p>
        )}

        {summary.atRiskGoalsCount > 0 && (
          <p className="text-amber-500">{t("executive.summary.atRiskGoals", { count: summary.atRiskGoalsCount })}</p>
        )}
      </div>
    </div>
  );
}
