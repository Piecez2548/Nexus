import { CheckCircle2 } from "lucide-react";
import ChartCard from "@/components/ui/ChartCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";
import type { GoalForecastEntry } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  entries: GoalForecastEntry[];
}

export default function GoalForecastList({ entries }: Props) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t("aiAnalytics.forecast.goals.title")}>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.goals.empty")}</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isComplete = entry.goal.currentAmount >= entry.goal.targetAmount;
            const percentage = entry.goal.targetAmount > 0 ? Math.min(100, (entry.goal.currentAmount / entry.goal.targetAmount) * 100) : 0;
            const isDelayed = entry.projectedDelayDays !== null && entry.projectedDelayDays > 0;

            return (
              <div key={entry.goal.name} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{entry.goal.name}</span>
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-500">
                      <CheckCircle2 size={12} />
                      {t("aiAnalytics.forecast.goals.reached")}
                    </span>
                  ) : (
                    entry.probabilityOfCompletion !== null && (
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {t("aiAnalytics.forecast.goals.probability", { value: Math.round(entry.probabilityOfCompletion) })}
                      </span>
                    )
                  )}
                </div>

                <ProgressBar percentage={percentage} colorClass={isComplete ? "bg-green-500" : "bg-brand-600"} />

                {!isComplete && (
                  <div className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <p>
                      {entry.paceKnown && entry.expectedCompletionDate !== null
                        ? t("aiAnalytics.forecast.goals.expectedCompletion", { date: entry.expectedCompletionDate })
                        : t("aiAnalytics.forecast.goals.paceUnknown")}
                    </p>
                    {entry.requiredMonthlyContribution !== null && (
                      <p>{t("aiAnalytics.forecast.goals.requiredContribution", { amount: Math.round(entry.requiredMonthlyContribution).toLocaleString() })}</p>
                    )}
                    {isDelayed && entry.projectedDelayDays !== null && (
                      <p className="font-medium text-amber-500">{t("aiAnalytics.forecast.goals.delayed", { days: entry.projectedDelayDays })}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
