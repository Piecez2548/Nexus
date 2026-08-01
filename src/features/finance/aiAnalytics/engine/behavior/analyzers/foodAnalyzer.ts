// "Food delivery usage" and "home cooking frequency (estimated)" are
// explicitly out of scope — no delivery-vs-dine-in signal exists in this
// data model, and estimating cooking frequency from its absence would be
// fabricated, not derived.

import { analyzeDomainSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/domainSpendingAnalyzer";
import { BEHAVIOR_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { BehaviorEngineContext, DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";

export function analyzeFoodSpending(context: BehaviorEngineContext): DomainSpendingAnalysis {
  return analyzeDomainSpending(context.transactions, BEHAVIOR_KEYWORDS.eatingOut, context.recipientProfiles, context.now);
}
