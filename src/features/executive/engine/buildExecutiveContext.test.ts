import { describe, expect, it } from "vitest";
import { buildExecutiveContext, type ExecutiveContextInput } from "./buildExecutiveContext";
import type { Todo } from "@/features/todo/types";
import type { Habit } from "@/features/habits/types";
import type { Goal } from "@/features/finance/types";
import type { WorkoutEntry } from "@/features/workouts/types";

const NOW = new Date(2026, 7, 21); // 2026-08-21, a Friday

function baseInput(overrides: Partial<ExecutiveContextInput> = {}): ExecutiveContextInput {
  return {
    todos: [],
    habits: [],
    scheduleItems: [],
    goals: [],
    goalMilestoneEvents: [],
    workoutEntries: [],
    budgetProgress: [],
    netWorthStats: { totalAssets: 0, totalLiabilities: 0, netWorth: 0 },
    tradingStats: { weeklyPnl: 0, winRate: 0, openPositions: 0, totalClosedTrades: 0 },
    now: NOW,
    ...overrides,
  };
}

describe("buildExecutiveContext", () => {
  it("handles a completely empty system (case 1: empty system, case 7: missing module data)", () => {
    const context = buildExecutiveContext(baseInput());

    expect(context.overdueTodos).toEqual([]);
    expect(context.todayTodos).toEqual([]);
    expect(context.habits).toEqual([]);
    expect(context.goals).toEqual([]);
    expect(context.schedule.current).toBeNull();
    expect(context.schedule.next).toBeNull();
    expect(context.finance.overallBudgetPercentage).toBeNull();
    expect(context.health.habitsCheckedInToday).toEqual({ done: 0, total: 0 });
    expect(context.health.workoutDaysThisWeek).toEqual({ done: 0, total: 7 });
  });

  it("splits overdue vs. due-today todos correctly (case 3: overdue items)", () => {
    const todos: Todo[] = [
      { id: 1, title: "Overdue task", dueDate: "2026-08-20", priority: "high", completed: false, createdAt: "2026-08-01" },
      { id: 2, title: "Due today", dueDate: "2026-08-21", priority: "medium", completed: false, createdAt: "2026-08-01" },
      { id: 3, title: "Future task", dueDate: "2026-08-25", priority: "low", completed: false, createdAt: "2026-08-01" },
      { id: 4, title: "Completed overdue", dueDate: "2026-08-01", priority: "high", completed: true, createdAt: "2026-08-01" },
    ];

    const context = buildExecutiveContext(baseInput({ todos }));

    expect(context.overdueTodos.map((t) => t.title)).toEqual(["Overdue task"]);
    expect(context.todayTodos.map((t) => t.title)).toEqual(["Due today"]);
  });

  it("computes goal progress and at-risk deadline status (case 5: deadlines, case 6: completed items)", () => {
    const goals: Goal[] = [
      { id: 1, name: "Past deadline, incomplete", targetAmount: 1000, currentAmount: 500, deadline: "2026-08-01" },
      { id: 2, name: "Completed goal", targetAmount: 1000, currentAmount: 1000, deadline: "2026-07-01" },
      { id: 3, name: "No deadline", targetAmount: 1000, currentAmount: 200 },
    ];

    const context = buildExecutiveContext(baseInput({ goals }));

    const pastDeadline = context.goals.find((g) => g.goal.name === "Past deadline, incomplete")!;
    expect(pastDeadline.isAtRisk).toBe(true);
    expect(pastDeadline.isComplete).toBe(false);

    const completed = context.goals.find((g) => g.goal.name === "Completed goal")!;
    expect(completed.isComplete).toBe(true);
    expect(completed.isAtRisk).toBe(false); // isComplete excludes at-risk regardless of deadline

    const noDeadline = context.goals.find((g) => g.goal.name === "No deadline")!;
    expect(noDeadline.daysRemaining).toBeNull();
    expect(noDeadline.isAtRisk).toBe(false);
  });

  it("computes habit streaks and today's completion (case 2: normal day)", () => {
    const habits: Habit[] = [
      { id: 1, name: "Meditate", frequency: "daily", completedDates: ["2026-08-21"], createdAt: "2026-08-01" },
      { id: 2, name: "Read", frequency: "daily", completedDates: ["2026-08-19", "2026-08-20"], createdAt: "2026-08-01" },
    ];

    const context = buildExecutiveContext(baseInput({ habits }));

    expect(context.habits.find((h) => h.name === "Meditate")?.isCompletedToday).toBe(true);
    expect(context.habits.find((h) => h.name === "Read")?.isCompletedToday).toBe(false);
    expect(context.habits.find((h) => h.name === "Read")?.streak).toBeGreaterThan(0);
    expect(context.health.habitsCheckedInToday).toEqual({ done: 1, total: 2 });
  });

  it("counts distinct workout days in the trailing 7-day window, not a fabricated target", () => {
    const workoutEntries: WorkoutEntry[] = [
      { exerciseName: "Push-up", date: "2026-08-21", caloriesBurned: 10, createdAt: "2026-08-21" },
      { exerciseName: "Squat", date: "2026-08-21", caloriesBurned: 10, createdAt: "2026-08-21" }, // same day, counts once
      { exerciseName: "Run", date: "2026-08-18", caloriesBurned: 50, createdAt: "2026-08-18" },
      { exerciseName: "Run", date: "2026-08-10", caloriesBurned: 50, createdAt: "2026-08-10" }, // outside the 7-day window
    ];

    const context = buildExecutiveContext(baseInput({ workoutEntries }));

    expect(context.health.workoutDaysThisWeek).toEqual({ done: 2, total: 7 });
  });

  it("computes overallBudgetPercentage as a weighted total, not an average of percentages", () => {
    const budgetProgress = [
      { budget: { category: "Food", amount: 1000, period: "monthly" as const }, spent: 500, remaining: 500, percentage: 50, status: "ok" as const },
      { budget: { category: "Shopping", amount: 100, period: "monthly" as const }, spent: 90, remaining: 10, percentage: 90, status: "near" as const },
    ];

    const context = buildExecutiveContext(baseInput({ budgetProgress }));

    // Weighted: (500+90) / (1000+100) * 100 = 53.6%, not (50+90)/2 = 70%
    expect(context.finance.overallBudgetPercentage).toBeCloseTo(53.636, 2);
    expect(context.finance.budgetsNearCount).toBe(1);
    expect(context.finance.budgetsOverCount).toBe(0);
  });

  it("passes trading and net worth snapshots through unchanged (no duplicate computation)", () => {
    const context = buildExecutiveContext(
      baseInput({
        netWorthStats: { totalAssets: 100000, totalLiabilities: 20000, netWorth: 80000 },
        tradingStats: { weeklyPnl: 500, winRate: 60, openPositions: 2, totalClosedTrades: 10 },
      })
    );

    expect(context.finance.netWorth).toBe(80000);
    expect(context.trading.winRate).toBe(60);
    expect(context.trading.totalClosedTrades).toBe(10);
  });
});
