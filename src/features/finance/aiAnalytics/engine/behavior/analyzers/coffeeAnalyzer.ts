import { analyzeDomainSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/domainSpendingAnalyzer";
import { BEHAVIOR_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { BehaviorEngineContext, DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";

export function analyzeCoffeeSpending(context: BehaviorEngineContext): DomainSpendingAnalysis {
  return analyzeDomainSpending(context.transactions, BEHAVIOR_KEYWORDS.coffee, context.recipientProfiles, context.now);
}
