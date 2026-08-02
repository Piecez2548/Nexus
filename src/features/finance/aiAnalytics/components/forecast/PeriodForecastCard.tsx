import { ArrowUpRight, ArrowDownRight, Wallet, PiggyBank, Hourglass } from "lucide-react";
import SummaryCard from "@/components/ui/SummaryCard";
import ChartCard from "@/components/ui/ChartCard";
import CircularScoreGauge from "@/components/ui/CircularScoreGauge";
import ForecastTrendChart from "@/features/finance/aiAnalytics/components/forecast/ForecastTrendChart";
import { useTranslation } from "@/i18n/useTranslation";
import type { PeriodForecast } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { BudgetPeriod } from "@/features/finance/types";

interface Props {
  periodForecast: PeriodForecast;
  period: BudgetPeriod;
  monthlyTrend: CashFlowMonthPoint[];
}

export default function PeriodForecastCard({ periodForecast, period, monthlyTrend }: Props) {
  const { t } = useTranslation();

  if (periodForecast.basis === "insufficientData") {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t("aiAnalytics.forecast.insufficientData")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("aiAnalytics.forecast.period.range", { rangeStart: periodForecast.rangeStart, rangeEnd: periodForecast.rangeEnd })}
        {" · "}
        {t("aiAnalytics.forecast.period.soFar", {
          income: Math.round(periodForecast.incomeSoFar).toLocaleString(),
          expense: Math.round(periodForecast.expenseSoFar).toLocaleString(),
        })}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          title={t("aiAnalytics.forecast.period.expectedIncome")}
          value={`฿${Math.round(periodForecast.expectedIncome).toLocaleString()}`}
          icon={<ArrowUpRight size={20} className="text-white" />}
          color="#16a34a"
        />
        <SummaryCard
          title={t("aiAnalytics.forecast.period.expectedExpense")}
          value={`฿${Math.round(periodForecast.expectedExpense).toLocaleString()}`}
          icon={<ArrowDownRight size={20} className="text-white" />}
          color="#dc2626"
        />
        <SummaryCard
          title={t("aiAnalytics.forecast.period.remainingExpectedExpense")}
          value={`฿${Math.round(periodForecast.remainingExpectedExpense).toLocaleString()}`}
          icon={<Hourglass size={20} className="text-white" />}
          color="#f59e0b"
        />
        <SummaryCard
          title={t("aiAnalytics.forecast.period.expectedSavings")}
          value={`฿${Math.round(periodForecast.expectedSavings).toLocaleString()}`}
          icon={<PiggyBank size={20} className="text-white" />}
          color="#8b5cf6"
        />
        {periodForecast.expectedEndOfPeriodBalance !== null && (
          <SummaryCard
            title={t("aiAnalytics.forecast.period.expectedEndOfPeriodBalance")}
            value={`฿${Math.round(periodForecast.expectedEndOfPeriodBalance).toLocaleString()}`}
            icon={<Wallet size={20} className="text-white" />}
            color="#6366f1"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title={t("aiAnalytics.forecast.period.stability")}>
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            {periodForecast.cashFlowStabilityScore === null ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.period.stabilityUnavailable")}</p>
            ) : (
              <CircularScoreGauge score={periodForecast.cashFlowStabilityScore} size={100} strokeWidth={9} colorClass="stroke-indigo-500" />
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.period.confidence", { value: periodForecast.confidence })}</p>
          </div>
        </ChartCard>

        {period === "monthly" && (
          <div className="lg:col-span-2">
            <ChartCard title={t("aiAnalytics.forecast.futureCashFlow")}>
              <ForecastTrendChart monthlyTrend={monthlyTrend} expectedSavings={periodForecast.expectedSavings} />
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
