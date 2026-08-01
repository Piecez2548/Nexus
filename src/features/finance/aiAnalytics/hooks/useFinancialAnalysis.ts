import { useEffect, useMemo, useRef, useState } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { localStatisticalEngine } from "@/features/finance/aiAnalytics/engine/localStatisticalEngine";
import { toErrorMessage } from "@/utils/asyncState";
import type { FinancialAnalysisResult, FinancialIntelligenceEngine } from "@/features/finance/aiAnalytics/types";

export interface FinancialAnalysisState {
  data: FinancialAnalysisResult | null;
  loading: boolean;
  error: string | null;
}

// `engine` defaults to the local statistical engine — this default param is
// the future-swap seam: a real AI backend just needs to implement
// FinancialIntelligenceEngine and get passed in here, with zero changes to
// the page or any section component. Doesn't call any load*() itself,
// matching Budget.tsx's convention that the page owns load orchestration.
export function useFinancialAnalysis(engine: FinancialIntelligenceEngine = localStatisticalEngine, now?: Date): FinancialAnalysisState {
  const { transactions } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const { categories } = useCategoryStore();
  const { goals } = useGoalStore();
  const { profiles: recipientProfiles } = useRecipientProfileStore();
  const { events: goalMilestoneEvents } = useGoalMilestoneEventStore();

  const [state, setState] = useState<FinancialAnalysisState>({ data: null, loading: true, error: null });

  // `now ?? new Date()` as a plain default parameter would construct a new
  // Date — a new object identity — on every render, since a caller that
  // never passes `now` (the common case) re-evaluates that default on every
  // call. That would make `input` below change identity every render,
  // re-firing the effect, re-triggering a state update, causing another
  // render — an infinite loop. Memoizing against `now` (stable `undefined`
  // when the caller never passes one) computes the snapshot exactly once.
  const resolvedNow = useMemo(() => now ?? new Date(), [now]);

  const input = useMemo(
    () => ({ transactions, budgets, categories, goals, recipientProfiles, goalMilestoneEvents, now: resolvedNow }),
    [transactions, budgets, categories, goals, recipientProfiles, goalMilestoneEvents, resolvedNow]
  );

  // A slower-to-resolve call (e.g. a future remote engine) started before a
  // faster one must never overwrite it with stale results once both
  // resolve — only the response to the most recently started request wins.
  const requestId = useRef(0);

  useEffect(() => {
    const thisRequestId = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    engine
      .analyze(input)
      .then((data) => {
        if (thisRequestId !== requestId.current) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (thisRequestId !== requestId.current) return;
        setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(err) }));
      });
  }, [engine, input]);

  return state;
}
