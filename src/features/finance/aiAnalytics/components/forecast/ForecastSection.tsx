import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import PeriodForecastCard from "@/features/finance/aiAnalytics/components/forecast/PeriodForecastCard";
import BudgetForecastCard from "@/features/finance/aiAnalytics/components/forecast/BudgetForecastCard";
import SavingsForecastCard from "@/features/finance/aiAnalytics/components/forecast/SavingsForecastCard";
import GoalForecastList from "@/features/finance/aiAnalytics/components/forecast/GoalForecastList";
import ForecastTrendAnalysisPanel from "@/features/finance/aiAnalytics/components/forecast/ForecastTrendAnalysisPanel";
import ForecastAlertsList from "@/features/finance/aiAnalytics/components/forecast/ForecastAlertsList";
import WhatIfScenarioPanel from "@/features/finance/aiAnalytics/components/forecast/WhatIfScenarioPanel";
import { SEVERITY_BADGE_CLASS } from "@/features/finance/aiAnalytics/constants/forecastAlertSeverity";
import type { ForecastEngineResult } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { BudgetPeriod } from "@/features/finance/types";

interface Props {
  result: ForecastEngineResult;
  monthlyTrend: CashFlowMonthPoint[];
  goalProgress: GoalProgressEntry[];
  spendingAnalysis: SpendingAnalysisResult;
  subscriptions: SubscriptionEntry[];
  now: Date;
}

const PERIODS: BudgetPeriod[] = ["monthly", "weekly", "yearly"];

const FORECAST_BY_PERIOD: Record<BudgetPeriod, (result: ForecastEngineResult) => ForecastEngineResult["details"]["monthlyForecast"]> = {
  monthly: (result) => result.details.monthlyForecast,
  weekly: (result) => result.details.weeklyForecast,
  yearly: (result) => result.details.yearlyForecast,
};

export default function ForecastSection({ result, monthlyTrend, goalProgress, spendingAnalysis, subscriptions, now }: Props) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-500" />
          <h2 className="text-lg font-semibold">{t("aiAnalytics.forecast.title")}</h2>
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {t("aiAnalytics.forecast.period.confidence", { value: result.confidence })}
          </span>
        </div>

        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                period === p
                  ? "bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {t(`common.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {result.summary.topAlert && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
          <p className="text-sm">{t(result.summary.topAlert.message.key, result.summary.topAlert.message.params)}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_CLASS[result.summary.topAlert.severity]}`}>
            {t(`aiAnalytics.forecast.alerts.severity.${result.summary.topAlert.severity}`)}
          </span>
        </div>
      )}

      <PeriodForecastCard periodForecast={FORECAST_BY_PERIOD[period](result)} period={period} monthlyTrend={monthlyTrend} />

      <BudgetForecastCard result={result.details.budgetForecast} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SavingsForecastCard result={result.details.savingsForecast} />
        <GoalForecastList entries={result.details.goalForecast} />
      </div>

      <ForecastTrendAnalysisPanel result={result.trendAnalysis} />

      <ForecastAlertsList alerts={result.alerts} />

      <WhatIfScenarioPanel goalProgress={goalProgress} spendingAnalysis={spendingAnalysis} subscriptions={subscriptions} now={now} />
    </div>
  );
}
