import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { ScheduleItem } from "@/features/schedule/types";
import type { Goal } from "@/features/finance/types";

// Every field here is derived from an existing module's own data at read
// time -- nothing is persisted, nothing is a second source of truth. See
// buildExecutiveContext.ts for exactly which existing pure functions/hook
// outputs feed each section.

export interface ExecutiveTodoItem {
  id: number;
  title: string;
  dueDate?: string;
  priority: Todo["priority"];
  isOverdue: boolean;
}

export interface ExecutiveHabitItem {
  id: number;
  name: string;
  frequency: Habit["frequency"];
  isCompletedToday: boolean;
  streak: number;
}

export interface ExecutiveScheduleSnapshot {
  current: ScheduleItem | null;
  currentProgress: number | null;
  next: ScheduleItem | null;
  nextDate: Date | null;
}

export interface ExecutiveGoalSnapshot {
  goal: Goal;
  progressPercent: number;
  isComplete: boolean;
  daysRemaining: number | null;
  isAtRisk: boolean;
}

export interface ExecutiveFinanceSnapshot {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  // Weighted (total spent / total budgeted), not an average of each
  // budget's own percentage -- an average would misweight a small budget
  // against a large one.
  overallBudgetPercentage: number | null;
  budgetsOverCount: number;
  budgetsNearCount: number;
  budgetsTrackedCount: number;
}

export interface ExecutiveTradingSnapshot {
  weeklyPnl: number;
  winRate: number;
  openPositions: number;
  totalClosedTrades: number;
}

export interface ExecutiveHealthSnapshot {
  // "done today / total daily habits" -- both numbers real, matching the
  // same shape dashboard/utils/dailySummary.ts already uses.
  habitsCheckedInToday: { done: number; total: number };
  // "days in the last 7 with >=1 workout logged, out of 7" -- a real
  // calendar-day ratio, not a fabricated weekly target (no such field
  // exists anywhere on WorkoutExercise/WorkoutEntry).
  workoutDaysThisWeek: { done: number; total: 7 };
}

export type ExecutivePriorityCategory = "todo" | "habit" | "goal";

export interface ExecutivePriorityReason {
  key: string; // i18n key under executive.reason.*
  params?: Record<string, string | number>;
}

export interface ExecutivePriorityItem {
  id: string; // `${category}-${sourceId}`, stable across renders
  category: ExecutivePriorityCategory;
  title: string;
  score: number;
  reasons: ExecutivePriorityReason[];
}

export type ExecutiveWorkloadLevel = "light" | "moderate" | "high";

export interface ExecutiveSummary {
  workloadLevel: ExecutiveWorkloadLevel;
  topPriority: ExecutivePriorityItem | null;
  overdueCount: number;
  atRiskGoalsCount: number;
  todayPriorityCount: number;
}

export interface ExecutiveContext {
  now: Date;
  overdueTodos: ExecutiveTodoItem[];
  todayTodos: ExecutiveTodoItem[]; // due today, not yet overdue
  habits: ExecutiveHabitItem[];
  schedule: ExecutiveScheduleSnapshot;
  goals: ExecutiveGoalSnapshot[];
  finance: ExecutiveFinanceSnapshot;
  trading: ExecutiveTradingSnapshot;
  health: ExecutiveHealthSnapshot;
}
