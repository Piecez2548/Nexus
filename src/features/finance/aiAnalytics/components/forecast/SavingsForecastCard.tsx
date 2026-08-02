import ChartCard from "@/components/ui/ChartCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { SavingsForecastResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  result: SavingsForecastResult;
}

export default function SavingsForecastCard({ result }: Props) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t("aiAnalytics.forecast.savings.title")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.savings.expectedMonthlySavings")}</p>
          <p className="text-xl font-bold">฿{Math.round(result.expectedMonthlySavings).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.savings.savingRate")}</p>
          <p className="text-xl font-bold">{result.savingRatePercent === null ? "—" : `${Math.round(result.savingRatePercent)}%`}</p>
        </div>
      </div>

      {(result.bestCaseMonthlySavings !== null || result.worstCaseMonthlySavings !== null) && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {t("aiAnalytics.forecast.savings.range", {
            worst: result.worstCaseMonthlySavings === null ? "—" : Math.round(result.worstCaseMonthlySavings).toLocaleString(),
            best: result.bestCaseMonthlySavings === null ? "—" : Math.round(result.bestCaseMonthlySavings).toLocaleString(),
          })}
        </p>
      )}

      {result.goalTimelines.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {result.goalTimelines.map((entry) => (
            <div key={entry.goalName} className="flex items-center justify-between text-sm">
              <span className="font-medium">{entry.goalName}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {entry.monthsToReachAtCurrentPace === null
                  ? t("aiAnalytics.forecast.savings.paceUnknown")
                  : t("aiAnalytics.forecast.savings.monthsToReach", { count: entry.monthsToReachAtCurrentPace })}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
