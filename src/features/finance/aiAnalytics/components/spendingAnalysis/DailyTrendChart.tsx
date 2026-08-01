import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "@/i18n/useTranslation";
import type { DailyTrendPoint } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

interface Props {
  dailyTrend: DailyTrendPoint[];
}

export default function DailyTrendChart({ dailyTrend }: Props) {
  const { t } = useTranslation();

  if (dailyTrend.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  const data = dailyTrend.map((d) => ({ day: d.date.slice(-2), amount: d.amount }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid stroke="#333" />
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
        <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
