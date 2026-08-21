import { analyzeGoals } from "@/features/finance/aiAnalytics/engine/analyzers/goalAnalyzer";
import { getCurrentAndNext } from "@/features/schedule/utils/activity";
import { isCompletedToday, computeStreak } from "@/features/habits/utils/streak";
import { getLoggedDates } from "@/features/workouts/utils/todaySummary";
import { isTodoOverdue, isTodoDueToday } from "@/features/executive/utils/todoStatus";
import { toLocalDateString } from "@/utils/localDate";
import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { ScheduleItem } from "@/features/schedule/types";
import type { Goal, GoalMilestoneEvent } from "@/features/finance/types";
import type { WorkoutEntry } from "@/features/workouts/types";
import type { BudgetProgress } from "@/features/finance/hooks/useBudgetProgress";
import type {
  ExecutiveContext,
  ExecutiveFinanceSnapshot,
  ExecutiveHealthSnapshot,
  ExecutiveTradingSnapshot,
} from "@/features/executive/types";

// Pre-computed snapshots this builder accepts rather than re-derives: each
// already has a real, existing hook (useTradingStats/useBudgetProgress/
// useNetWorthStats) whose own useMemo wraps this exact math. Re-deriving it
// here from raw transactions/trades would duplicate that business logic
// (and, for trading specifically, there is no standalone exported pure
// function to call -- the computation lives only inside useTradingStats'
// useMemo body) -- so the orchestrating hook calls those hooks itself and
// passes their output straight through, keeping this function hook-free
// and independently testable with plain data.
export interface NetWorthSnapshotInput {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface TradingStatsInput {
  weeklyPnl: number;
  winRate: number;
  openPositions: number;
  totalClosedTrades: number;
}

export interface ExecutiveContextInput {
  todos: Todo[];
  habits: Habit[];
  scheduleItems: ScheduleItem[];
  goals: Goal[];
  goalMilestoneEvents: GoalMilestoneEvent[];
  workoutEntries: WorkoutEntry[];
  budgetProgress: BudgetProgress[];
  netWorthStats: NetWorthSnapshotInput;
  tradingStats: TradingStatsInput;
  now: Date;
}

const WORKOUT_WEEK_DAYS = 7;

function buildFinanceSnapshot(budgetProgress: BudgetProgress[], netWorthStats: NetWorthSnapshotInput): ExecutiveFinanceSnapshot {
  const totalSpent = budgetProgress.reduce((sum, b) => sum + b.spent, 0);
  const totalBudgeted = budgetProgress.reduce((sum, b) => sum + b.budget.amount, 0);

  return {
    netWorth: netWorthStats.netWorth,
    totalAssets: netWorthStats.totalAssets,
    totalLiabilities: netWorthStats.totalLiabilities,
    overallBudgetPercentage: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : null,
    budgetsOverCount: budgetProgress.filter((b) => b.status === "over").length,
    budgetsNearCount: budgetProgress.filter((b) => b.status === "near").length,
    budgetsTrackedCount: budgetProgress.length,
  };
}

function buildTradingSnapshot(stats: TradingStatsInput): ExecutiveTradingSnapshot {
  return {
    weeklyPnl: stats.weeklyPnl,
    winRate: stats.winRate,
    openPositions: stats.openPositions,
    totalClosedTrades: stats.totalClosedTrades,
  };
}

function buildHealthSnapshot(habits: Habit[], workoutEntries: WorkoutEntry[], now: Date): ExecutiveHealthSnapshot {
  const dailyHabits = habits.filter((h) => h.frequency === "daily");
  const habitsCheckedInToday = {
    done: dailyHabits.filter((h) => isCompletedToday(h.completedDates, now)).length,
    total: dailyHabits.length,
  };

  const loggedDates = new Set(getLoggedDates(workoutEntries));
  let workoutDaysDone = 0;
  for (let i = 0; i < WORKOUT_WEEK_DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (loggedDates.has(toLocalDateString(d))) workoutDaysDone++;
  }

  return {
    habitsCheckedInToday,
    workoutDaysThisWeek: { done: workoutDaysDone, total: WORKOUT_WEEK_DAYS },
  };
}

export function buildExecutiveContext(input: ExecutiveContextInput): ExecutiveContext {
  const { todos, habits, scheduleItems, goals, goalMilestoneEvents, workoutEntries, budgetProgress, netWorthStats, tradingStats, now } = input;

  const overdueTodos = todos
    .filter((t) => isTodoOverdue(t, now))
    .map((t) => ({ id: t.id ?? 0, title: t.title, dueDate: t.dueDate, priority: t.priority, isOverdue: true }));

  const todayTodos = todos
    .filter((t) => isTodoDueToday(t, now))
    .map((t) => ({ id: t.id ?? 0, title: t.title, dueDate: t.dueDate, priority: t.priority, isOverdue: false }));

  const habitItems = habits.map((h) => ({
    id: h.id ?? 0,
    name: h.name,
    frequency: h.frequency,
    isCompletedToday: isCompletedToday(h.completedDates, now),
    streak: computeStreak(h.completedDates, h.frequency, now),
  }));

  const { current, currentProgress, next, nextDate } = getCurrentAndNext(scheduleItems, now);

  const goalSnapshots = analyzeGoals(goals, goalMilestoneEvents, now).map((entry) => ({
    goal: entry.goal,
    progressPercent: entry.progressPercent,
    isComplete: entry.isComplete,
    daysRemaining: entry.daysRemaining,
    isAtRisk: entry.isDeadlinePassedIncomplete,
  }));

  return {
    now,
    overdueTodos,
    todayTodos,
    habits: habitItems,
    schedule: { current, currentProgress, next, nextDate },
    goals: goalSnapshots,
    finance: buildFinanceSnapshot(budgetProgress, netWorthStats),
    trading: buildTradingSnapshot(tradingStats),
    health: buildHealthSnapshot(habits, workoutEntries, now),
  };
}
