import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { CategoryMonthlyTrendPoint } from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";

interface Props {
  monthlyTrend: CategoryMonthlyTrendPoint[];
}

// A minimal single-series line chart — MonthlyTrendChart.tsx isn't reusable
// here, it's hardcoded to 3 fixed income/expense/saving lines.
export default function CategoryMonthlyTrendChart({ monthlyTrend }: Props) {
  const { t } = useTranslation();

  const hasData = monthlyTrend.some((m) => m.amount > 0);
  if (!hasData) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  const data = monthlyTrend.map((m) => ({ month: m.monthKey.slice(5), amount: m.amount }));

  return (
    <ChartFigure label={t("aiAnalytics.charts.categoryMonthlyTrend", { count: data.length })}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid stroke="#333" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
          <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
