import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScoreTrendPoint } from "@/features/finance/aiAnalytics/engine/scoring/types";

interface Props {
  points: ScoreTrendPoint[];
}

export default function TrendComparisonChart({ points }: Props) {
  const { t } = useTranslation();

  const data = points.map((p) => ({
    label: t(`aiAnalytics.financialHealthScore.trend.${p.label}`),
    score: p.overallScore,
  }));

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t("aiAnalytics.financialHealthScore.trend.title")}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          {/* Historical points before the profile had any data score null —
              connectNulls keeps the line readable instead of breaking it at
              every gap. */}
          <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} connectNulls dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
