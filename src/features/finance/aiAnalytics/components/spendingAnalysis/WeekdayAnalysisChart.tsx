import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { WeekdayAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

interface Props {
  weekdayAnalysis: WeekdayAnalysisEntry[];
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// A single brand hue, not the categorical 8-color palette used for
// expense-by-category charts — weekdays are ordinal, not distinct
// categories competing for identity.
const BAR_COLOR = "#8b5cf6";

export default function WeekdayAnalysisChart({ weekdayAnalysis }: Props) {
  const { t } = useTranslation();

  const hasData = weekdayAnalysis.some((w) => w.total > 0);
  if (!hasData) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  const data = weekdayAnalysis.map((w) => ({ weekday: t(`aiAnalytics.weekdays.${WEEKDAY_KEYS[w.weekday]}`), total: w.total }));

  return (
    <ChartFigure label={t("aiAnalytics.charts.weekdayAnalysis")}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid stroke="#333" />
          <XAxis dataKey="weekday" />
          <YAxis />
          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
          <Bar dataKey="total" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
