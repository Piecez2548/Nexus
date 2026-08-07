import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import ChartFigure from "@/features/finance/aiAnalytics/components/ChartFigure";
import { useTranslation } from "@/i18n/useTranslation";
import type { BehaviorScores } from "@/features/finance/aiAnalytics/engine/behavior/types";

// Same structure as financialHealthScore/HealthScoreRadarChart.tsx.
// `overall` is deliberately excluded as an axis — it's the average of the
// other six, so plotting it alongside its own components would be
// circular; it's shown as its own headline number in BehaviorProfileSection.
const RADAR_SCORE_KEYS = ["restaurant", "shopping", "coffee", "budgetDiscipline", "impulseControl", "consistency"] as const;

interface Props {
  scores: BehaviorScores;
}

interface RadarPoint {
  score: string;
  value: number;
  hasData: boolean;
}

export default function BehaviorRadarChart({ scores }: Props) {
  const { t } = useTranslation();

  const data: RadarPoint[] = RADAR_SCORE_KEYS.map((key) => ({
    score: t(`aiAnalytics.behaviorProfile.scores.${key}`),
    value: scores[key] ?? 0,
    hasData: scores[key] !== null,
  }));

  return (
    <ChartFigure label={t("aiAnalytics.charts.behaviorRadar")}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="score" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
          <Tooltip
            formatter={(value, _name, item) => {
              const point = item.payload as RadarPoint;
              return point.hasData ? Math.round(Number(value)) : t("aiAnalytics.healthScore.notApplicable");
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
