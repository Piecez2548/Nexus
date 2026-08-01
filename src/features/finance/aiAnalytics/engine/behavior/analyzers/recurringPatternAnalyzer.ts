// Genuinely new: for each top merchant, computes the trailing weekday
// distribution of visits and flags a dominant weekday when one clearly
// stands out (e.g. "you shop at Tesco almost every Sunday") — answers the
// spec's "Repeated merchants" / "Weekly habits" recurring-pattern ask.
// Nothing else in this codebase computes visit cadence by weekday.

import { confidenceForCount } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import type { Transaction, RecipientProfile } from "@/features/finance/types";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { RecurringMerchantPattern } from "@/features/finance/aiAnalytics/engine/behavior/types";

const MIN_OCCURRENCES_FOR_PATTERN = 3;
const DOMINANT_WEEKDAY_SHARE_THRESHOLD_PERCENT = 40;

function weekdayOf(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

// Only merchants with a genuinely dominant weekday are returned — a
// "recurring pattern" list that included every merchant regardless of
// whether one was found wouldn't be a pattern list.
export function analyzeRecurringMerchantPatterns(topMerchants: TopMerchantEntry[], recipientProfiles: RecipientProfile[], transactions: Transaction[]): RecurringMerchantPattern[] {
  const patterns: RecurringMerchantPattern[] = [];

  for (const merchant of topMerchants) {
    if (merchant.transactionCount < MIN_OCCURRENCES_FOR_PATTERN) continue;

    // Alias is the join key back to raw transactions — matches the same
    // convention merchant-analysis.model.ts already established (topMerchants
    // entries don't carry the raw recipientKey, only alias).
    const recipientKey = recipientProfiles.find((p) => p.alias === merchant.alias)?.recipientKey;
    if (!recipientKey) continue;

    const merchantTransactions = transactions.filter((t) => t.type === "expense" && t.recipient === recipientKey);
    if (merchantTransactions.length < MIN_OCCURRENCES_FOR_PATTERN) continue;

    const weekdayCounts = new Array(7).fill(0) as number[];
    for (const t of merchantTransactions) weekdayCounts[weekdayOf(t.date)] += 1;

    const maxCount = Math.max(...weekdayCounts);
    const dominantWeekdayShare = (maxCount / merchantTransactions.length) * 100;
    if (dominantWeekdayShare < DOMINANT_WEEKDAY_SHARE_THRESHOLD_PERCENT) continue;

    patterns.push({
      merchantAlias: merchant.alias,
      dominantWeekday: weekdayCounts.indexOf(maxCount),
      dominantWeekdayShare: Math.round(dominantWeekdayShare),
      occurrenceCount: merchantTransactions.length,
      confidence: confidenceForCount(merchantTransactions.length),
    });
  }

  return patterns.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}
