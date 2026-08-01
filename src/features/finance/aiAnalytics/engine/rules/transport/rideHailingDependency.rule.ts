import { lastNMonthRanges } from "@/features/finance/utils/cashFlowMath";
import { isDateWithinRange } from "@/features/finance/utils/periodRange";
import { matchesKeywordFlag, recipientAliasLookup } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { FinancialRule, RuleContext } from "@/features/finance/aiAnalytics/engine/rules/types";
import { confidenceForSampleSize, ruleMessages, type RecommendationDraft } from "@/features/finance/aiAnalytics/engine/rules/shared";

// A narrower sub-list of TRANSPORT_KEYWORDS — fuel/transit spend doesn't
// signal "dependency" on ride-hailing specifically the way a high visit
// count for Grab/Bolt/taxi does.
const RIDE_HAILING_KEYWORDS = ["grab", "bolt", "taxi", "แท็กซี่", "วินมอเตอร์ไซค์"];
const RIDE_HAILING_VISIT_THRESHOLD = 15;
const ANALYSIS_WINDOW_MONTHS = 3;
const REDUCTION_ASSUMPTION = 0.3;

function evaluate(context: RuleContext): RecommendationDraft[] {
  const months = lastNMonthRanges(ANALYSIS_WINDOW_MONTHS, context.now);
  const range = { start: months[0].range.start, end: months[months.length - 1].range.end };
  const aliasByKey = recipientAliasLookup(context.recipientProfiles);

  const matches = context.transactions.filter(
    (t) => t.type === "expense" && isDateWithinRange(t.date, range) && matchesKeywordFlag(t, RIDE_HAILING_KEYWORDS, aliasByKey)
  );
  if (matches.length <= RIDE_HAILING_VISIT_THRESHOLD) return [];

  const total = matches.reduce((sum, t) => sum + t.amount, 0);

  return [
    {
      id: "ride-hailing-dependency",
      key: "rideHailingDependency",
      priority: "medium",
      estimatedMonthlySavings: Math.round(total * REDUCTION_ASSUMPTION),
      confidence: confidenceForSampleSize(matches.length),
      params: { count: matches.length },
      ...ruleMessages("rideHailingDependency", {}, { count: matches.length, threshold: RIDE_HAILING_VISIT_THRESHOLD }),
    },
  ];
}

const rule: FinancialRule = {
  id: "rideHailingDependency",
  name: "Ride-Hailing Dependency",
  description: "Fires when ride-hailing (Grab/Bolt/taxi) rides exceed 15 in the trailing 3-month window.",
  category: "expense",
  defaultPriority: "medium",
  enabled: true,
  evaluate,
};

export default rule;
