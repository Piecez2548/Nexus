import ChartCard from "@/components/ui/ChartCard";
import ChangeBadge from "@/components/ui/ChangeBadge";
import { useTranslation } from "@/i18n/useTranslation";
import type { CategoryTrendResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

interface Props {
  result: CategoryTrendResult;
}

const MAX_VISIBLE_ENTRIES = 5;

export default function CategoryTrendList({ result }: Props) {
  const { t } = useTranslation();

  return (
    <ChartCard title={t("aiAnalytics.forecast.trend.category.title")}>
      {result.entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.trend.empty")}</p>
      ) : (
        <div className="space-y-3">
          {(result.fastestGrowingCategory || result.fastestDecliningCategory) && (
            <div className="space-y-1 text-sm">
              {result.fastestGrowingCategory && (
                <p>{t("aiAnalytics.forecast.trend.category.fastestGrowing", { category: result.fastestGrowingCategory })}</p>
              )}
              {result.fastestDecliningCategory && (
                <p>{t("aiAnalytics.forecast.trend.category.fastestDeclining", { category: result.fastestDecliningCategory })}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {result.entries.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
              <div key={entry.category} className="flex items-center justify-between text-sm">
                <span className="font-medium">{entry.category}</span>
                {entry.direction === "insufficientData" ? (
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">{t("aiAnalytics.forecast.trend.insufficientData")}</span>
                ) : (
                  <ChangeBadge value={entry.monthlyGrowthPercent} invert />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
