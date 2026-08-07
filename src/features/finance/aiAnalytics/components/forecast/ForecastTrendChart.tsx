import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

interface Props {
  monthlyTrend: CashFlowMonthPoint[];
  expectedSavings: number;
}

// Deliberately separate from MonthlyTrendChart — mixing actuals and a
// projection into one undifferentiated line is a dataviz anti-pattern.
// The projected segment is drawn dashed/lighter, and only ever connects
// the last actual point to the single forecasted point.
export default function ForecastTrendChart({ monthlyTrend, expectedSavings }: Props) {
  const { t } = useTranslation();

  if (monthlyTrend.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.forecast.insufficientData")}</p>;
  }

  const data = monthlyTrend.map((m, i) => ({
    monthKey: m.monthKey,
    saving: m.saving,
    projectedSaving: i >= monthlyTrend.length - 2 ? (i === monthlyTrend.length - 1 ? expectedSavings : m.saving) : null,
  }));

  return (
    <ChartFigure label={t("aiAnalytics.charts.forecastTrend")}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid stroke="#333" />
          <XAxis dataKey="monthKey" />
          <YAxis />
          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
          <Line type="monotone" dataKey="saving" name={t("aiAnalytics.cashFlowAnalysis.saving")} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          <Line
            type="monotone"
            dataKey="projectedSaving"
            name={t("aiAnalytics.forecast.expectedSavings")}
            stroke="#a78bfa"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
