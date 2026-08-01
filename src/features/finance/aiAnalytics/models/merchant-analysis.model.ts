// MerchantAnalysis — a real per-merchant list, richer than
// behaviorAnalysis.ts's embedded `topMerchants` (which the rest of the
// engine still reads directly and is untouched here). Adds two fields
// nothing currently computes — largestPurchase (one array walk over the
// merchant's own transactions) and monthlyGrowthPercent (pctChange on the
// merchant's own monthlyTrend, the same two-point comparison
// fastestGrowingMerchant.rule.ts already does inline for its own threshold
// check) — plus the recommendations already produced for that merchant.

import { pctChange } from "@/features/finance/utils/cashFlowMath";
import type { RecipientProfile, Transaction } from "@/features/finance/types";
import type { BehaviorAnalysisResult, MerchantMonthlyTrendPoint } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { TransactionExtreme } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

export interface MerchantAnalysis {
  readonly alias: string;
  readonly frequency: number;
  readonly totalSpending: number;
  readonly averagePurchase: number;
  readonly largestPurchase: TransactionExtreme | null;
  // null when there's under 2 months of trend to compare, same convention
  // as every other change-percent field in this engine.
  readonly monthlyGrowthPercent: number | null;
  // Always a single-element array today — RecipientProfile carries one
  // category per merchant, not several. Kept as an array to match the
  // spec's plural field and stay forward-compatible if that ever changes.
  readonly categories: readonly string[];
  readonly recommendations: readonly Recommendation[];
}

function largestPurchaseFor(recipientKey: string | undefined, transactions: Transaction[]): TransactionExtreme | null {
  if (!recipientKey) return null;
  const matches = transactions.filter((t) => t.type === "expense" && t.recipient === recipientKey);
  if (matches.length === 0) return null;
  const largest = matches.reduce((max, t) => (t.amount > max.amount ? t : max));
  return { id: largest.id, title: largest.title, amount: largest.amount, category: largest.category, date: largest.date };
}

function monthlyGrowthPercent(monthlyTrend: MerchantMonthlyTrendPoint[]): number | null {
  if (monthlyTrend.length < 2) return null;
  const current = monthlyTrend[monthlyTrend.length - 1].amount;
  const previous = monthlyTrend[monthlyTrend.length - 2].amount;
  return pctChange(current, previous);
}

// Alias is the join key back to raw transactions/recommendations, not
// recipientKey — matches how the rest of the engine already treats it as a
// merchant's effective identity (merchantDependency.rule.ts and
// fastestGrowingMerchant.rule.ts both key their recommendation params by
// `merchant: alias`, not recipientKey).
export function buildMerchantAnalysis(
  behaviorAnalysis: BehaviorAnalysisResult,
  recipientProfiles: RecipientProfile[],
  transactions: Transaction[],
  recommendations: Recommendation[]
): MerchantAnalysis[] {
  return behaviorAnalysis.topMerchants.map((merchant) => {
    const recipientKey = recipientProfiles.find((p) => p.alias === merchant.alias)?.recipientKey;

    return {
      alias: merchant.alias,
      frequency: merchant.transactionCount,
      totalSpending: merchant.totalAmount,
      averagePurchase: merchant.averagePurchase,
      largestPurchase: largestPurchaseFor(recipientKey, transactions),
      monthlyGrowthPercent: monthlyGrowthPercent(merchant.monthlyTrend),
      categories: [merchant.category],
      recommendations: recommendations.filter((r) => r.params.merchant === merchant.alias),
    };
  });
}
