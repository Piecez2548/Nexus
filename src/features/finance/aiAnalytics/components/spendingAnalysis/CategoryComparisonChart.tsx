import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { CategoryComparisonEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

interface Props {
  entries: CategoryComparisonEntry[];
}

export default function CategoryComparisonChart({ entries }: Props) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  const data = entries.slice(0, 8).map((e) => ({ category: e.category, current: e.current, previous: e.previous }));

  return (
    <ChartFigure label={t("aiAnalytics.charts.categoryComparison", { count: data.length })}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
          <CartesianGrid stroke="#333" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="category" width={90} />
          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
          <Bar dataKey="previous" name={t("aiAnalytics.spendingAnalysis.previous")} fill="#a1a1aa" radius={[0, 4, 4, 0]} />
          <Bar dataKey="current" name={t("aiAnalytics.spendingAnalysis.current")} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
