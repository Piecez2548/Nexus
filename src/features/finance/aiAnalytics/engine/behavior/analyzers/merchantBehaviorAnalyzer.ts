// Combines the already-computed MerchantAnalysis[] (Prompt 004 — has
// monthlyGrowthPercent/largestPurchase/frequency/totalSpending) with
// behaviorAnalysis.topMerchants (has monthlyTrend, needed only for
// "loyalty") by alias. Favorite/Most Expensive are pure re-rankings of
// already-computed fields — not new data.

import type { MerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { MerchantBehaviorEntry } from "@/features/finance/aiAnalytics/engine/behavior/types";

export function analyzeMerchantBehavior(merchantAnalysis: MerchantAnalysis[], topMerchants: TopMerchantEntry[]): MerchantBehaviorEntry[] {
  if (merchantAnalysis.length === 0) return [];

  const mostFrequentAlias = merchantAnalysis.reduce((max, m) => (m.frequency > max.frequency ? m : max)).alias;
  const mostExpensiveAlias = merchantAnalysis.reduce((max, m) => (m.totalSpending > max.totalSpending ? m : max)).alias;
  const trendByAlias = new Map(topMerchants.map((m) => [m.alias, m.monthlyTrend]));

  return merchantAnalysis
    .map((m): MerchantBehaviorEntry => {
      const trend = trendByAlias.get(m.alias) ?? [];
      return {
        alias: m.alias,
        category: m.categories[0] ?? "",
        totalSpending: m.totalSpending,
        frequency: m.frequency,
        isFavorite: m.alias === mostFrequentAlias,
        isMostExpensive: m.alias === mostExpensiveAlias,
        loyaltyMonthsActive: trend.filter((point) => point.amount > 0).length,
        monthlyGrowthPercent: m.monthlyGrowthPercent,
      };
    })
    .sort((a, b) => b.totalSpending - a.totalSpending);
}
