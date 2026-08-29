import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { computeScoreTrend, defaultTrendPoints } from "@/features/finance/aiAnalytics/engine/scoring/score-engine/scoreTrend";
import type { ScoreTrendPoint } from "@/features/finance/aiAnalytics/engine/scoring/types";

// Synchronous, unlike useFinancialAnalysis.ts — computeScoreTrend re-runs
// the analyzer pipeline once per trend point, but stays pure JS with no
// I/O, so there's no FinancialIntelligenceEngine-style async seam needed
// here. Mirrors useFinancialAnalysis.ts's own now-memoization reasoning: a
// caller that never passes `now` must still get a stable Date identity
// across renders, or `points`/the returned array would change identity
// every render.
export function useFinancialHealthTrend(now?: Date): ScoreTrendPoint[] {
  const transactions = useTransactionStore((state) => state.transactions);
  const budgets = useBudgetStore((state) => state.budgets);
  const goals = useGoalStore((state) => state.goals);
  const recipientProfiles = useRecipientProfileStore((state) => state.profiles);
  const goalMilestoneEvents = useGoalMilestoneEventStore((state) => state.events);

  const resolvedNow = useMemo(() => now ?? new Date(), [now]);

  return useMemo(() => {
    const points = defaultTrendPoints(resolvedNow);
    return computeScoreTrend({ transactions, budgets, goals, recipientProfiles, goalMilestoneEvents }, points);
  }, [transactions, budgets, goals, recipientProfiles, goalMilestoneEvents, resolvedNow]);
}
