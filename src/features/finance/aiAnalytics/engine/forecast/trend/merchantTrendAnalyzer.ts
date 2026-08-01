// Merchant Trend Analysis — a pure re-ranking of the already-computed
// Prompt 004 MerchantAnalysis[] (alias/frequency/totalSpending/
// monthlyGrowthPercent already exist there), zero recomputation.

import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { MerchantTrendDirection, MerchantTrendEntry, MerchantTrendResult } from "@/features/finance/aiAnalytics/engine/forecast/types";

// A more sensitive threshold than fastestGrowingMerchant.rule.ts's own 50%
// (that rule flags an extreme outlier for an alert; this classifies every
// merchant's general trend direction, so it deliberately uses a lower bar).
const GROWTH_THRESHOLD_PERCENT = 15;

function classify(growthPercent: number | null): MerchantTrendDirection {
  if (growthPercent === null) return "insufficientData";
  if (growthPercent > GROWTH_THRESHOLD_PERCENT) return "growing";
  if (growthPercent < -GROWTH_THRESHOLD_PERCENT) return "declining";
  return "stable";
}

function toEntry(merchant: MerchantAnalysis): MerchantTrendEntry {
  return { alias: merchant.alias, monthlyGrowthPercent: merchant.monthlyGrowthPercent, direction: classify(merchant.monthlyGrowthPercent) };
}

export function analyzeMerchantTrends(merchantAnalysis: readonly MerchantAnalysis[]): MerchantTrendResult {
  const entries = merchantAnalysis.map(toEntry);

  const mostVisited = [...merchantAnalysis].sort((a, b) => b.frequency - a.frequency).map(toEntry);
  const growingMerchants = entries.filter((e) => e.direction === "growing").sort((a, b) => (b.monthlyGrowthPercent ?? 0) - (a.monthlyGrowthPercent ?? 0));
  const decliningMerchants = entries.filter((e) => e.direction === "declining").sort((a, b) => (a.monthlyGrowthPercent ?? 0) - (b.monthlyGrowthPercent ?? 0));

  const totalSpending = merchantAnalysis.reduce((sum, m) => sum + m.totalSpending, 0);
  const topBySpending = merchantAnalysis.length > 0 ? merchantAnalysis.reduce((top, m) => (m.totalSpending > top.totalSpending ? m : top)) : null;
  const spendingConcentrationPercent = topBySpending && totalSpending > 0 ? (topBySpending.totalSpending / totalSpending) * 100 : null;

  return { mostVisited, growingMerchants, decliningMerchants, spendingConcentrationPercent };
}
