// computeScoreTrend() — "score history" without persistence: recomputes
// the scoring pipeline at each requested historical `now`, against the
// full transaction history the app already retains. defaultTrendPoints()
// covers the spec's weekly/monthly/yearly comparison ask with one week,
// one/three/six months, and one year ago, plus the current point.

import { computeFinancialHealthScore } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/computeFinancialHealthScore";
import { buildScoreContext, type ScoreContextInput } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/buildScoreContext";
import type { ScoringConfig } from "@/features/finance/aiAnalytics/engine/scoring/weights/defaultConfig";
import type { ScoreTrendPoint } from "@/features/finance/aiAnalytics/engine/scoring/types";

export interface TrendPointSpec {
  label: string;
  now: Date;
}

export function computeScoreTrend(input: ScoreContextInput, points: TrendPointSpec[], config?: Partial<ScoringConfig>): ScoreTrendPoint[] {
  return points.map((point) => {
    const context = buildScoreContext(input, point.now);
    const result = computeFinancialHealthScore(context, config);
    return { label: point.label, now: point.now, overallScore: result.overallScore, grade: result.grade };
  });
}

function monthsAgo(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() - months, date.getDate());
}

function daysAgo(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

// Oldest first, ending with `now` itself — matches this engine's existing
// monthly-trend convention (cashFlowAnalysis.monthlyTrend, etc.).
export function defaultTrendPoints(now: Date): TrendPointSpec[] {
  return [
    { label: "oneYearAgo", now: monthsAgo(now, 12) },
    { label: "sixMonthsAgo", now: monthsAgo(now, 6) },
    { label: "threeMonthsAgo", now: monthsAgo(now, 3) },
    { label: "oneMonthAgo", now: monthsAgo(now, 1) },
    { label: "oneWeekAgo", now: daysAgo(now, 7) },
    { label: "now", now },
  ];
}
