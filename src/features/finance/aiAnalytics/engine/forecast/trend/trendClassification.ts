import { trailingIncreasingCount } from "@/features/finance/aiAnalytics/engine/analyzers/multiMonthTrends";
import { pctChange } from "@/features/finance/utils/cashFlowMath";
import type { TrendDirection } from "@/features/finance/aiAnalytics/engine/forecast/types";

const MIN_CONSECUTIVE_FOR_TREND = 2;

// Shared by Category/Merchant/Behavior Trend — classifies an oldest-first
// series of period totals as increasing/decreasing/stable, reusing the
// same "unbroken run ending at the most recent period" semantics as
// multiMonthTrends.trailingIncreasingCount. Decreasing is detected by
// negating the series and reusing the same increasing-run primitive,
// rather than duplicating its walk logic for the opposite direction.
export function classifyDirection(values: number[]): TrendDirection {
  // A fixed-length trailing window (e.g. monthlyValuesFor's 6-month array)
  // is always the same length regardless of how sparse the underlying data
  // is — a plain values.length check would never catch a category with
  // just one real data point padded out by zeros. Active (non-zero) count
  // is the real signal.
  const activeCount = values.filter((v) => v !== 0).length;
  if (activeCount < 2) return "insufficientData";

  if (trailingIncreasingCount(values) >= MIN_CONSECUTIVE_FOR_TREND) return "increasing";

  const decreasingCount = trailingIncreasingCount(values.map((v) => -v));
  if (decreasingCount >= MIN_CONSECUTIVE_FOR_TREND) return "decreasing";

  return "stable";
}

// Shared by Category and Behavior Trend — % change between the most recent
// two points of an oldest-first series. Null when there's fewer than 2
// points, or pctChange's own no-baseline case (previous value is 0).
export function lastTwoPointGrowth(values: number[]): number | null {
  return values.length >= 2 ? pctChange(values[values.length - 1], values[values.length - 2]) : null;
}
