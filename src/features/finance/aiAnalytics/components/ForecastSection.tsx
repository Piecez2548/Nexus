import { TrendingUp } from "lucide-react";
import SummaryCard from "@/components/ui/SummaryCard";
import ChartCard from "@/components/ui/ChartCard";
import ForecastTrendChart from "@/features/finance/aiAnalytics/components/ForecastTrendChart";
import { useTranslation } from "@/i18n/useTranslation";
import type { ForecastResult } from "@/features/finance/aiAnalytics/engine/analyzers/forecast";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

interface Props {
  result: ForecastResult;
  monthlyTrend: CashFlowMonthPoint[];
}

export default function ForecastSection({ result, monthlyTrend }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-indigo-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.forecast.title")}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          title={t("aiAnalytics.forecast.expectedBalance")}
          value={`฿${Math.round(result.expectedEndOfMonthBalance).toLocaleString()}`}
          icon={<TrendingUp size={20} className="text-white" />}
          color="#6366f1"
        />
        <SummaryCard
          title={t("aiAnalytics.forecast.expectedSavings")}
          value={`฿${Math.round(result.expectedSavings).toLocaleString()}`}
          icon={<TrendingUp size={20} className="text-white" />}
          color="#8b5cf6"
        />
      </div>

      <ChartCard title={t("aiAnalytics.forecast.futureCashFlow")}>
        {result.futureCashFlowTrend.basis === "insufficientData" ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.insufficientData")}</p>
        ) : (
          <ForecastTrendChart monthlyTrend={monthlyTrend} expectedSavings={result.expectedSavings} />
        )}
      </ChartCard>

      <ChartCard title={t("aiAnalytics.forecast.overflowRisk")}>
        {result.budgetOverflowRisk.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.noRisk")}</p>
        ) : (
          <ul className="space-y-2">
            {result.budgetOverflowRisk.map((risk) => (
              <li key={risk.category} className="flex items-center justify-between text-sm">
                <span className="font-medium">{risk.category}</span>
                <span className="text-amber-500">
                  ฿{Math.round(risk.projectedSpend).toLocaleString()} ({Math.round(risk.projectedPercentage)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}
