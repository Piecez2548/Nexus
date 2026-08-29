import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { localStatisticalEngine } from "@/features/finance/aiAnalytics/engine/localStatisticalEngine";
import { toErrorMessage } from "@/utils/asyncState";
import type { FinancialAnalysisResult, FinancialIntelligenceEngine } from "@/features/finance/aiAnalytics/types";

interface AnalysisSnapshot {
  data: FinancialAnalysisResult | null;
  loading: boolean;
  error: string | null;
}

export interface FinancialAnalysisState extends AnalysisSnapshot {
  // Re-runs the analysis against the current store data. Reruns nothing
  // outside this hook — no reload, no store refetch — so it's a safe retry
  // affordance for ErrorState (replacing a full-page reload).
  retry: () => void;
}

// `engine` defaults to the local statistical engine — this default param is
// the future-swap seam: a real AI backend just needs to implement
// FinancialIntelligenceEngine and get passed in here, with zero changes to
// the page or any section component. Doesn't call any load*() itself,
// matching Budget.tsx's convention that the page owns load orchestration.
export function useFinancialAnalysis(engine: FinancialIntelligenceEngine = localStatisticalEngine, now?: Date): FinancialAnalysisState {
  const transactions = useTransactionStore((state) => state.transactions);
  const budgets = useBudgetStore((state) => state.budgets);
  const categories = useCategoryStore((state) => state.categories);
  const goals = useGoalStore((state) => state.goals);
  const recipientProfiles = useRecipientProfileStore((state) => state.profiles);
  const goalMilestoneEvents = useGoalMilestoneEventStore((state) => state.events);

  const [state, setState] = useState<AnalysisSnapshot>({ data: null, loading: true, error: null });

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

  // Bumping this re-fires the effect below with the same `input`, recomputing
  // the analysis on demand. `retry` is stable (empty deps), so passing it to
  // ErrorState never triggers an extra render.
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  useEffect(() => {
    const thisRequestId = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // `engine` is a swappable seam, so don't assume analyze() always returns
    // a promise — a synchronous throw (e.g. the local engine's
    // Promise.resolve(runAnalysis(input)) evaluating runAnalysis before the
    // wrap) would otherwise escape this chain and leave the UI stuck on
    // `loading`. Starting from Promise.resolve() routes that throw into the
    // same .catch as a rejection, so it surfaces as an error state (UX-002).
    Promise.resolve()
      .then(() => engine.analyze(input))
      .then((data) => {
        if (thisRequestId !== requestId.current) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (thisRequestId !== requestId.current) return;
        setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(err) }));
      });
  }, [engine, input, retryToken]);

  return { ...state, retry };
}
