// Shared primitive for the 5 detectors that all follow the same shape:
// "read a BehaviorFlag by key, classify polarity by its share of the
// trailing window's expense." Restaurant/Coffee/ConvenienceStore/Weekend/
// LateNight are each a ~5-line wrapper around this — this is what "reusable
// detectors" + "no duplicated logic" mean together in practice.

import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { DetectedHabit, HabitPolarity } from "@/features/finance/aiAnalytics/engine/behavior/types";

export interface FlagDetectorThresholds {
  highSharePercent: number;
  lowSharePercent: number;
}

export const DEFAULT_LOW_SHARE_PERCENT = 5;
const RECENT_WINDOW_MONTHS = 3;

// behaviorAnalysis.ts's flags are scoped to the trailing 3-month window, not
// the current month alone — this recomputes the matching expense total from
// cashFlowAnalysis.monthlyTrend (already 6 months) so a flag's share is
// measured against the same window it was computed over. Shared by every
// detector that needs it, rather than each re-deriving it.
export function recentWindowExpense(cashFlowAnalysis: CashFlowAnalysisResult, months = RECENT_WINDOW_MONTHS): number {
  return cashFlowAnalysis.monthlyTrend.slice(-months).reduce((sum, m) => sum + m.expense, 0);
}

// Mirrors the same 35/60/85 tiering as Prompt 006's confidence base values
// (rules/shared.ts's confidenceForSampleSize semantics) — kept as its own
// small copy rather than importing across engine subsystems for one helper.
export function confidenceForCount(count: number): number {
  if (count >= 10) return 85;
  if (count >= 3) return 60;
  return 35;
}

export function detectFlagHabit(flag: BehaviorFlag, windowExpense: number, habitId: string, thresholds: FlagDetectorThresholds): DetectedHabit | null {
  if (flag.transactionCount === 0 || flag.dataQuality === "unavailable") return null;

  const sharePercent = windowExpense > 0 ? (flag.totalAmount / windowExpense) * 100 : 0;
  const polarity: HabitPolarity = sharePercent >= thresholds.highSharePercent ? "negative" : sharePercent <= thresholds.lowSharePercent ? "positive" : "neutral";
  const params = { count: flag.transactionCount, amount: Math.round(flag.totalAmount), percent: Math.round(sharePercent) };

  return {
    id: habitId,
    polarity,
    confidence: confidenceForCount(flag.transactionCount),
    message: { key: `aiAnalytics.behaviorProfile.detectors.${habitId}.${polarity}`, params },
    supportingMetrics: params,
  };
}
