// No dedicated "shopping" flag or keyword list exists (unlike
// eatingOut/coffee/convenienceStore/transport) — this matches transaction
// category names against a shopping-ish keyword pattern instead, reusing
// domainSpendingAnalyzer's shared trend/top-merchant aggregation via its
// predicate-based entry point. SHOPPING_CATEGORY_PATTERN is exported so
// detectors/shoppingDetector.ts uses the exact same matcher, not a second
// copy of it.

import { analyzeDomainSpendingByPredicate } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/domainSpendingAnalyzer";
import type { BehaviorEngineContext, DomainSpendingAnalysis } from "@/features/finance/aiAnalytics/engine/behavior/types";

export const SHOPPING_CATEGORY_PATTERN = /shopping|retail|clothes|clothing|fashion|department store/i;

export function analyzeShoppingSpending(context: BehaviorEngineContext): DomainSpendingAnalysis {
  return analyzeDomainSpendingByPredicate(
    context.transactions,
    (t) => t.category !== undefined && SHOPPING_CATEGORY_PATTERN.test(t.category),
    context.recipientProfiles,
    context.now
  );
}
