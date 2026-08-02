import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { simulateScenario } from "@/features/finance/aiAnalytics/engine/forecast/scenarios/whatIfScenarios";
import type { WhatIfScenarioInput, WhatIfResult } from "@/features/finance/aiAnalytics/engine/forecast/types";
import type { GoalProgressEntry } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { BehaviorAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

// Mirrors useCategoryDetail.ts's synchronous, useMemo-based on-demand
// pattern — What-If simulation is pure local computation, not a candidate
// for a future remote-AI swap. Unlike useCategoryDetail, simulateScenario's
// WhatIfScenarioContext needs analyzer OUTPUTS (goalProgress,
// spendingAnalysis) that aren't cheaply re-derivable from raw store arrays
// without re-running analyzeGoals/analyzeSpending a second time — so those,
// plus subscriptions and now, are taken as explicit arguments, sourced from
// the page's already-computed FinancialAnalysisResult.
export function useWhatIfScenario(
  input: WhatIfScenarioInput | null,
  goalProgress: GoalProgressEntry[],
  spendingAnalysis: SpendingAnalysisResult,
  subscriptions: BehaviorAnalysisResult["subscriptions"],
  now: Date
): WhatIfResult | null {
  const { transactions } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const { goals } = useGoalStore();
  const { profiles: recipientProfiles } = useRecipientProfileStore();
  const { events: goalMilestoneEvents } = useGoalMilestoneEventStore();

  return useMemo(() => {
    if (input === null) return null;
    return simulateScenario(input, {
      transactions,
      budgets,
      goals,
      goalMilestoneEvents,
      recipientProfiles,
      goalProgress,
      spendingAnalysis,
      subscriptions,
      now,
    });
  }, [input, transactions, budgets, goals, goalMilestoneEvents, recipientProfiles, goalProgress, spendingAnalysis, subscriptions, now]);
}
