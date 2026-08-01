// Wraps recurringPatternAnalyzer.ts's weekday-cadence computation — this
// detector can surface several habits at once (one per merchant with a
// clear cadence), unlike the single-habit-or-null detectors elsewhere.

import { analyzeRecurringMerchantPatterns } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/recurringPatternAnalyzer";
import type { BehaviorEngineContext, DetectedHabit } from "@/features/finance/aiAnalytics/engine/behavior/types";

export function detectRecurringExpenseHabits(context: BehaviorEngineContext): DetectedHabit[] {
  const patterns = analyzeRecurringMerchantPatterns(context.behaviorAnalysis.topMerchants, context.recipientProfiles, context.transactions);

  return patterns.map((p) => ({
    id: `recurringExpense-${p.merchantAlias}`,
    // A repeating visit pattern is routine, not inherently good or bad —
    // the merchant-specific detectors (restaurant/coffee/shopping/etc.)
    // already carry the value judgment on the spending itself.
    polarity: "neutral" as const,
    confidence: p.confidence,
    message: { key: "aiAnalytics.behaviorProfile.detectors.recurringExpense.neutral", params: { merchant: p.merchantAlias, weekday: p.dominantWeekday ?? 0, share: p.dominantWeekdayShare } },
    supportingMetrics: { occurrenceCount: p.occurrenceCount, share: p.dominantWeekdayShare },
  }));
}
