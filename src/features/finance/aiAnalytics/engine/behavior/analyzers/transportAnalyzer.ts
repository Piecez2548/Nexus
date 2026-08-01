import { analyzeDomainSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/domainSpendingAnalyzer";
import { TRANSPORT_KEYWORDS } from "@/features/finance/aiAnalytics/engine/constants/behaviorKeywords";
import type { BehaviorEngineContext, DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";

// "Fuel expenses" vs. "public transportation" vs. "ride-hailing" aren't
// broken out separately — TRANSPORT_KEYWORDS (Prompt 003) already blends
// ride-hailing/taxi/rail/fuel keywords into one signal, and this data model
// has no structured field to split them further without guessing from
// free-text titles.
export function analyzeTransportSpending(context: BehaviorEngineContext): DomainSpendingAnalysis {
  return analyzeDomainSpending(context.transactions, TRANSPORT_KEYWORDS, context.recipientProfiles, context.now);
}
