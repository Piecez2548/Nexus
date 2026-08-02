import { PiggyBank } from "lucide-react";
import ChartCard from "@/components/ui/ChartCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";
import type { BudgetForecastClassification, BudgetForecastResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  result: BudgetForecastResult;
}

const CLASSIFICATION_BADGE_CLASS: Record<BudgetForecastClassification, string> = {
  likelyExceed: "bg-red-500/15 text-red-500",
  likelyRemainUnder: "bg-green-500/15 text-green-500",
};

const CLASSIFICATION_BAR_CLASS: Record<BudgetForecastClassification, string> = {
  likelyExceed: "bg-red-500",
  likelyRemainUnder: "bg-green-500",
};

export default function BudgetForecastCard({ result }: Props) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t("aiAnalytics.forecast.budget.title")}>
      {result.entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.budget.empty")}</p>
      ) : (
        <div className="space-y-4">
          {(result.categoriesLikelyToExceed.length > 0 || result.categoriesLikelyToRemainUnder.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {result.categoriesLikelyToExceed.map((category) => (
                <span key={`exceed-${category}`} className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-500">
                  <PiggyBank size={12} />
                  {t("aiAnalytics.forecast.budget.likelyExceed", { category })}
                </span>
              ))}
              {result.categoriesLikelyToRemainUnder.map((category) => (
                <span key={`under-${category}`} className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
                  {t("aiAnalytics.forecast.budget.likelyRemainUnder", { category })}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {result.entries.map((entry) => (
              <div key={`${entry.category}-${entry.period}`} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{entry.category}</span>
                    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t(`common.${entry.period}`)}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CLASSIFICATION_BADGE_CLASS[entry.classification]}`}>
                    {t(`aiAnalytics.forecast.budget.classification.${entry.classification}`)}
                  </span>
                </div>

                <ProgressBar percentage={entry.completionPercentage} colorClass={CLASSIFICATION_BAR_CLASS[entry.classification]} />

                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    {t("aiAnalytics.forecast.budget.projected", {
                      projectedSpend: Math.round(entry.projectedSpend).toLocaleString(),
                      budgetAmount: Math.round(entry.budgetAmount).toLocaleString(),
                      percent: Math.round(entry.projectedPercentage),
                    })}
                  </span>
                  {entry.estimatedOverflowAmount > 0 && (
                    <span className="font-medium text-red-500">
                      {t("aiAnalytics.forecast.budget.overflow", { amount: Math.round(entry.estimatedOverflowAmount).toLocaleString() })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
