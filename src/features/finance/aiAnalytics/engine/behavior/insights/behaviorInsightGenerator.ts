// Explainable trend/pattern insights ("Restaurant visits increased 22%",
// "Weekend spending is consistently higher") — built from data the
// analyzers already computed (domain monthlyTrend, weekdayAnalysis,
// behaviorAnalysis.flags), matching insights.ts's own established
// {key,params} convention.

import { pctChange } from "@/features/finance/utils/cashFlowMath";
import type { WeekdayAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { BehaviorEngineContext, BehaviorMessage, DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";

const NS = "aiAnalytics.behaviorProfile.insights";
const TREND_NOTABLE_PERCENT = 15;
const WEEKEND_INSIGHT_MARGIN_PERCENT = 20;
const LATE_NIGHT_FREQUENT_COUNT = 5;

function domainTrendInsight(domain: string, analysis: DomainSpendingAnalysis): BehaviorMessage | null {
  const { monthlyTrend } = analysis;
  if (monthlyTrend.length < 2) return null;

  const current = monthlyTrend[monthlyTrend.length - 1].amount;
  const previous = monthlyTrend[monthlyTrend.length - 2].amount;
  const change = pctChange(current, previous);
  if (change === null || Math.abs(change) < TREND_NOTABLE_PERCENT) return null;

  const direction = change > 0 ? "increased" : "decreased";
  return { key: `${NS}.trend.${domain}.${direction}`, params: { percent: Math.round(Math.abs(change)) } };
}

// Mirrors insights.ts's own weekendOverspending calculation (per-transaction
// averages, not raw totals — a small handful of weekend days can never
// outspend many more weekdays in raw sums).
function weekendConsistentlyHigherInsight(weekdayAnalysis: WeekdayAnalysisEntry[]): BehaviorMessage | null {
  const weekend = weekdayAnalysis.filter((w) => w.weekday === 0 || w.weekday === 6);
  const weekday = weekdayAnalysis.filter((w) => w.weekday >= 1 && w.weekday <= 5);
  const weekendCount = weekend.reduce((sum, w) => sum + w.count, 0);
  const weekdayCount = weekday.reduce((sum, w) => sum + w.count, 0);
  if (weekendCount === 0 || weekdayCount === 0) return null;

  const weekendAverage = weekend.reduce((sum, w) => sum + w.total, 0) / weekendCount;
  const weekdayAverage = weekday.reduce((sum, w) => sum + w.total, 0) / weekdayCount;
  if (weekdayAverage <= 0) return null;

  const marginPercent = ((weekendAverage - weekdayAverage) / weekdayAverage) * 100;
  if (marginPercent < WEEKEND_INSIGHT_MARGIN_PERCENT) return null;

  return { key: `${NS}.weekendConsistentlyHigher`, params: { weekendAverage: Math.round(weekendAverage), weekdayAverage: Math.round(weekdayAverage) } };
}

function frequentLateNightInsight(flags: BehaviorFlag[]): BehaviorMessage | null {
  const flag = flags.find((f) => f.key === "nightSpending");
  if (!flag || flag.dataQuality === "unavailable" || flag.transactionCount < LATE_NIGHT_FREQUENT_COUNT) return null;
  return { key: `${NS}.frequentLateNight`, params: { count: flag.transactionCount } };
}

export function generateBehaviorInsights(context: BehaviorEngineContext, foodAnalysis: DomainSpendingAnalysis, coffeeAnalysis: DomainSpendingAnalysis): BehaviorMessage[] {
  return [
    domainTrendInsight("restaurant", foodAnalysis),
    domainTrendInsight("coffee", coffeeAnalysis),
    weekendConsistentlyHigherInsight(context.spendingAnalysis.weekdayAnalysis),
    frequentLateNightInsight(context.behaviorAnalysis.flags),
  ].filter((insight): insight is BehaviorMessage => insight !== null);
}
