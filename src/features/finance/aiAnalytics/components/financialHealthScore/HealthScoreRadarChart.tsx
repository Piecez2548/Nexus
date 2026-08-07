import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import ChartDataTable from "@/features/finance/aiAnalytics/components/ChartDataTable";
import { useTranslation } from "@/i18n/useTranslation";
import type { CategoryScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

interface Props {
  categoryScores: CategoryScoreResult[];
}

interface RadarPoint {
  category: string;
  score: number;
  hasData: boolean;
}

export default function HealthScoreRadarChart({ categoryScores }: Props) {
  const { t } = useTranslation();

  // A radar chart needs every axis present to form a coherent shape — a
  // category with no data (null score) is plotted at 0 but its tooltip
  // says "N/A" rather than implying a real score of zero.
  const data: RadarPoint[] = categoryScores.map((c) => ({
    category: t(`aiAnalytics.financialHealthScore.categories.${c.category}`),
    score: c.score ?? 0,
    hasData: c.score !== null,
  }));

  return (
    <>
      <ChartFigure label={t("aiAnalytics.charts.healthRadar", { count: data.length })}>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
            <Tooltip
              formatter={(value, _name, item) => {
                const point = item.payload as RadarPoint;
                return point.hasData ? Math.round(Number(value)) : t("aiAnalytics.healthScore.notApplicable");
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </ChartFigure>
      <ChartDataTable
        caption={t("aiAnalytics.charts.healthRadar", { count: data.length })}
        columns={[t("aiAnalytics.charts.table.category"), t("aiAnalytics.charts.table.score")]}
        rows={data.map((d) => [d.category, d.hasData ? Math.round(d.score) : t("aiAnalytics.healthScore.notApplicable")])}
      />
    </>
  );
}
