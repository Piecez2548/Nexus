import { useCallback, useEffect, useMemo } from "react";

import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { useWorkoutEntryStore } from "@/features/workouts/store/workoutEntryStore";
import { useBudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import { useNetWorthStats } from "@/features/finance/hooks/useNetWorthStats";
import { useNowTick } from "@/features/schedule/hooks/useNowTick";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";

import { buildExecutiveContext } from "@/features/executive/engine/buildExecutiveContext";
import { calculateExecutivePriorities } from "@/features/executive/engine/calculateExecutivePriorities";
import { buildExecutiveSummary } from "@/features/executive/engine/buildExecutiveSummary";
import type { ExecutiveContext, ExecutivePriorityItem, ExecutiveSummary } from "@/features/executive/types";

export interface ExecutiveDashboardState {
  context: ExecutiveContext;
  priorities: ExecutivePriorityItem[];
  summary: ExecutiveSummary;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

// Orchestration only -- every number here comes from an existing store or
// an existing hook (useBudgetProgress/useNetWorthStats),
// read once here and handed to the pure engine functions. No new fetch, no
// new Dexie table, no computation this hook owns itself.
export function useExecutiveDashboard(): ExecutiveDashboardState {
  const { todos, loading: todosLoading, error: todosError, loadTodos } = useTodoStore();
  const { habits, loading: habitsLoading, error: habitsError, loadHabits } = useHabitStore();
  const { items: scheduleItems, loading: scheduleLoading, error: scheduleError, loadItems } = useScheduleItemStore();
  const { goals, loading: goalsLoading, error: goalsError, loadGoals } = useGoalStore();
  const { events: goalMilestoneEvents, loadEvents } = useGoalMilestoneEventStore();
  const { entries: workoutEntries, loading: workoutsLoading, error: workoutsError, loadEntries } = useWorkoutEntryStore();

  // useBudgetProgress/useNetWorthStats only read whatever is already in
  // these stores -- unlike the six stores above, neither triggers its own
  // load. Without loading these explicitly here, landing on /executive
  // directly (without having first visited /finance in this session) would
  // silently show a zeroed-out Finance snapshot even though real data
  // exists in Dexie.
  const { loading: transactionsLoading, error: transactionsError, loadTransactions } = useTransactionStore();
  const { loading: budgetsLoading, error: budgetsError, loadBudgets } = useBudgetStore();
  const { loading: netWorthLoading, error: netWorthError, loadItems: loadNetWorthItems } = useNetWorthItemStore();

  const budgetProgress = useBudgetProgress();
  const netWorthStats = useNetWorthStats();

  const loadAll = useCallback(() => {
    loadTodos();
    loadHabits();
    loadItems();
    loadGoals();
    loadEvents();
    loadEntries();
    loadTransactions();
    loadBudgets();
    loadNetWorthItems();
  }, [
    loadTodos,
    loadHabits,
    loadItems,
    loadGoals,
    loadEvents,
    loadEntries,
    loadTransactions,
    loadBudgets,
    loadNetWorthItems,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const now = useNowTick();

  const context = useMemo(
    () =>
      buildExecutiveContext({
        todos,
        habits,
        scheduleItems,
        goals,
        goalMilestoneEvents,
        workoutEntries,
        budgetProgress,
        netWorthStats,
        now,
      }),
    [todos, habits, scheduleItems, goals, goalMilestoneEvents, workoutEntries, budgetProgress, netWorthStats, now]
  );

  const priorities = useMemo(() => calculateExecutivePriorities(context), [context]);
  const summary = useMemo(() => buildExecutiveSummary(context, priorities), [context, priorities]);

  const loading =
    todosLoading ||
    habitsLoading ||
    scheduleLoading ||
    goalsLoading ||
    workoutsLoading ||
    transactionsLoading ||
    budgetsLoading ||
    netWorthLoading;
  const error =
    todosError ??
    habitsError ??
    scheduleError ??
    goalsError ??
    workoutsError ??
    transactionsError ??
    budgetsError ??
    netWorthError ??
    null;

  return { context, priorities, summary, loading, error, retry: loadAll };
}
