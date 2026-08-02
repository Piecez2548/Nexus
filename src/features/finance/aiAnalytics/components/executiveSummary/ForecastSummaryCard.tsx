import { TrendingUp } from "lucide-react";
import CircularScoreGauge from "@/components/ui/CircularScoreGauge";
import { useTranslation } from "@/i18n/useTranslation";
import type { ForecastSummarySection } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";

interface Props {
  result: ForecastSummarySection;
}

// A pure selection over the same forecastProfile.summary the Forecast
// section's own PeriodForecastCard already renders — reuses its exact
// stat/stability/at-risk-chip labels rather than authoring near-duplicate
// new copy for the same underlying numbers.
export default function ForecastSummaryCard({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-indigo-500" />
        <h3 className="text-sm font-semibold">{t("aiAnalytics.executiveSummaryReport.forecastSummary.title")}</h3>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.period.expectedEndOfPeriodBalance")}</p>
            <p className="text-xl font-bold">{result.expectedEndOfMonthBalance === null ? "—" : `฿${Math.round(result.expectedEndOfMonthBalance).toLocaleString()}`}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.period.expectedSavings")}</p>
            <p className="text-xl font-bold">฿{Math.round(result.expectedSavings).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          {result.cashFlowStabilityScore === null ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.period.stabilityUnavailable")}</p>
          ) : (
            <CircularScoreGauge score={result.cashFlowStabilityScore} size={80} strokeWidth={8} colorClass="stroke-indigo-500" label={t("aiAnalytics.forecast.period.stability")} />
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-600">{t("aiAnalytics.forecast.period.confidence", { value: result.confidence })}</p>
        </div>
      </div>

      {(result.categoriesLikelyToExceed.length > 0 || result.goalsAtRisk.length > 0 || result.categoriesLikelyToRemainUnder.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {result.categoriesLikelyToExceed.map((category) => (
            <span key={`exceed-${category}`} className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-500">
              {t("aiAnalytics.forecast.budget.likelyExceed", { category })}
            </span>
          ))}
          {result.goalsAtRisk.map((goal) => (
            <span key={`goal-${goal}`} className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-500">
              {t("aiAnalytics.executiveSummaryReport.forecastSummary.goalAtRisk", { goal })}
            </span>
          ))}
          {result.categoriesLikelyToRemainUnder.map((category) => (
            <span key={`under-${category}`} className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
              {t("aiAnalytics.forecast.budget.likelyRemainUnder", { category })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
