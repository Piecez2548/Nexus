import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { WeeklyTrendPoint } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

interface Props {
  weeklyTrend: WeeklyTrendPoint[];
}

export default function WeeklyTrendChart({ weeklyTrend }: Props) {
  const { t } = useTranslation();

  const hasData = weeklyTrend.some((w) => w.amount > 0);
  if (!hasData) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  const data = weeklyTrend.map((w) => ({ week: w.weekStart.slice(5), amount: w.amount }));

  return (
    <ChartFigure label={t("aiAnalytics.charts.weeklyTrend", { count: data.length })}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid stroke="#333" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
          <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
