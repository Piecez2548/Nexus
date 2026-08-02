import ChartCard from "@/components/ui/ChartCard";
import ChangeBadge from "@/components/ui/ChangeBadge";
import CategoryTrendList from "@/features/finance/aiAnalytics/components/forecast/CategoryTrendList";
import MerchantTrendList from "@/features/finance/aiAnalytics/components/forecast/MerchantTrendList";
import { useTranslation } from "@/i18n/useTranslation";
import type { ForecastTrendAnalysis } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  result: ForecastTrendAnalysis;
}

export default function ForecastTrendAnalysisPanel({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.trend.title")}</h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CategoryTrendList result={result.category} />
        <MerchantTrendList result={result.merchant} />

        <ChartCard title={t("aiAnalytics.forecast.trend.behavior.title")}>
          <div className="space-y-2">
            {result.behavior.entries.map((entry) => (
              <div key={entry.domain} className="flex items-center justify-between text-sm">
                <span className="font-medium">{t(`aiAnalytics.forecast.trend.behavior.domains.${entry.domain}`)}</span>
                {entry.direction === "insufficientData" ? (
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">{t("aiAnalytics.forecast.trend.insufficientData")}</span>
                ) : (
                  <ChangeBadge value={entry.changePercent} invert />
                )}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
