import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import ChartDataTable from "@/features/finance/aiAnalytics/components/ChartDataTable";
import { useTranslation } from "@/i18n/useTranslation";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

interface Props {
  monthlyTrend: CashFlowMonthPoint[];
}

// Shared by SpendingAnalysisSection and CashFlowAnalysisSection — both
// consume the exact same CashFlowMonthPoint[] computed once by
// cashFlowAnalysis.ts, so this one component guarantees they never
// disagree with each other.
export default function MonthlyTrendChart({ monthlyTrend }: Props) {
  const { t } = useTranslation();

  const hasData = monthlyTrend.some((m) => m.income > 0 || m.expense > 0);
  if (!hasData) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  return (
    <>
      <ChartFigure label={t("aiAnalytics.charts.monthlyTrend", { count: monthlyTrend.length })}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid stroke="#333" />
            <XAxis dataKey="monthKey" />
            <YAxis />
            <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
            <Line type="monotone" dataKey="income" name={t("aiAnalytics.cashFlowAnalysis.income")} stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="expense" name={t("aiAnalytics.cashFlowAnalysis.expense")} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="saving" name={t("aiAnalytics.cashFlowAnalysis.saving")} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFigure>
      <ChartDataTable
        caption={t("aiAnalytics.charts.monthlyTrend", { count: monthlyTrend.length })}
        columns={[
          t("aiAnalytics.charts.table.month"),
          t("aiAnalytics.cashFlowAnalysis.income"),
          t("aiAnalytics.cashFlowAnalysis.expense"),
          t("aiAnalytics.cashFlowAnalysis.saving"),
        ]}
        rows={monthlyTrend.map((m) => [m.monthKey, `฿${m.income.toLocaleString()}`, `฿${m.expense.toLocaleString()}`, `฿${m.saving.toLocaleString()}`])}
      />
    </>
  );
}
