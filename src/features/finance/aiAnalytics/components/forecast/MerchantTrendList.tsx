import ChartCard from "@/components/ui/ChartCard";
import ChangeBadge from "@/components/ui/ChangeBadge";
import { useTranslation } from "@/i18n/useTranslation";
import type { MerchantTrendResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  result: MerchantTrendResult;
}

const MAX_VISIBLE_ENTRIES = 5;

export default function MerchantTrendList({ result }: Props) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t("aiAnalytics.forecast.trend.merchant.title")}>
      {result.mostVisited.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.trend.empty")}</p>
      ) : (
        <div className="space-y-4">
          {result.spendingConcentrationPercent !== null && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("aiAnalytics.forecast.trend.merchant.concentration", { value: Math.round(result.spendingConcentrationPercent) })}
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              {t("aiAnalytics.forecast.trend.merchant.mostVisited")}
            </p>
            <div className="space-y-2">
              {result.mostVisited.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
                <div key={entry.alias} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{entry.alias}</span>
                  {entry.direction === "insufficientData" ? (
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">{t("aiAnalytics.forecast.trend.insufficientData")}</span>
                  ) : (
                    <ChangeBadge value={entry.monthlyGrowthPercent} invert />
                  )}
                </div>
              ))}
            </div>
          </div>

          {result.growingMerchants.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                {t("aiAnalytics.forecast.trend.merchant.growing")}
              </p>
              <div className="flex flex-wrap gap-2">
                {result.growingMerchants.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
                  <span key={entry.alias} className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-500">
                    {entry.alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.decliningMerchants.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                {t("aiAnalytics.forecast.trend.merchant.declining")}
              </p>
              <div className="flex flex-wrap gap-2">
                {result.decliningMerchants.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
                  <span key={entry.alias} className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-500">
                    {entry.alias}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}
