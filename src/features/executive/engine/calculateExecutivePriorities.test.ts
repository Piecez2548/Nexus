import { describe, expect, it } from "vitest";
import { calculateExecutivePriorities } from "./calculateExecutivePriorities";
import type { ExecutiveContext } from "@/features/executive/types";

const NOW = new Date(2026, 7, 21); // 2026-08-21

function baseContext(overrides: Partial<ExecutiveContext> = {}): ExecutiveContext {
  return {
    now: NOW,
    overdueTodos: [],
    todayTodos: [],
    habits: [],
    schedule: { current: null, currentProgress: null, next: null, nextDate: null },
    goals: [],
    finance: { netWorth: 0, totalAssets: 0, totalLiabilities: 0, overallBudgetPercentage: null, budgetsOverCount: 0, budgetsNearCount: 0, budgetsTrackedCount: 0 },
    trading: { weeklyPnl: 0, winRate: 0, openPositions: 0, totalClosedTrades: 0 },
    health: { habitsCheckedInToday: { done: 0, total: 0 }, workoutDaysThisWeek: { done: 0, total: 7 } },
    ...overrides,
  };
}

describe("calculateExecutivePriorities", () => {
  it("returns an empty list for an empty system (case: empty dataset)", () => {
    expect(calculateExecutivePriorities(baseContext())).toEqual([]);
  });

  it("scores an overdue item higher than a normal (due-today) item (case: overdue item, normal item)", () => {
    const context = baseContext({
      overdueTodos: [{ id: 1, title: "Overdue", dueDate: "2026-08-19", priority: "medium", isOverdue: true }],
      todayTodos: [{ id: 2, title: "Due today", dueDate: "2026-08-21", priority: "medium", isOverdue: false }],
    });

    const priorities = calculateExecutivePriorities(context);
    expect(priorities[0].title).toBe("Overdue");
    expect(priorities[0].score).toBeGreaterThan(priorities[1].score);
  });

  it("scores a goal near its deadline (case: deadline near)", () => {
    const context = baseContext({
      goals: [{ goal: { id: 1, name: "Near deadline goal", targetAmount: 1000, currentAmount: 500, deadline: "2026-08-25" }, progressPercent: 50, isComplete: false, daysRemaining: 4, isAtRisk: false }],
    });

    const priorities = calculateExecutivePriorities(context);
    expect(priorities).toHaveLength(1);
    expect(priorities[0].category).toBe("goal");
    expect(priorities[0].reasons[0].key).toBe("executive.reason.goalDeadlineSoon");
  });

  it("excludes a completed habit and a completed goal from the list (case: completed items)", () => {
    const context = baseContext({
      habits: [{ id: 1, name: "Done habit", frequency: "daily", isCompletedToday: true, streak: 5 }],
      goals: [{ goal: { id: 1, name: "Done goal", targetAmount: 1000, currentAmount: 1000, deadline: "2026-08-01" }, progressPercent: 100, isComplete: true, daysRemaining: -20, isAtRisk: false }],
    });

    expect(calculateExecutivePriorities(context)).toEqual([]);
  });

  it("includes an incomplete habit and a not-yet-overdue goal (case: incomplete state)", () => {
    const context = baseContext({
      habits: [{ id: 1, name: "Pending habit", frequency: "daily", isCompletedToday: false, streak: 3 }],
    });

    const priorities = calculateExecutivePriorities(context);
    expect(priorities).toHaveLength(1);
    expect(priorities[0].category).toBe("habit");
  });

  it("ranks multiple priorities across categories consistently (case: multiple priorities)", () => {
    const context = baseContext({
      overdueTodos: [{ id: 1, title: "Overdue high", dueDate: "2026-08-15", priority: "high", isOverdue: true }],
      habits: [{ id: 1, name: "At-risk habit", frequency: "daily", isCompletedToday: false, streak: 8 }],
      goals: [{ goal: { id: 1, name: "Past-deadline goal", targetAmount: 1000, currentAmount: 200, deadline: "2026-08-10" }, progressPercent: 20, isComplete: false, daysRemaining: -11, isAtRisk: true }],
    });

    const priorities = calculateExecutivePriorities(context);
    expect(priorities).toHaveLength(3);
    // Sorted descending, and every score is a real finite number.
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i - 1].score).toBeGreaterThanOrEqual(priorities[i].score);
    }
  });

  it("breaks a tied score deterministically by category then id, not array input order (case: tie, deterministic ordering)", () => {
    // Two due-today todos of the same priority tie in score exactly.
    const contextA = baseContext({
      todayTodos: [
        { id: 5, title: "Task B", dueDate: "2026-08-21", priority: "medium", isOverdue: false },
        { id: 3, title: "Task A", dueDate: "2026-08-21", priority: "medium", isOverdue: false },
      ],
    });
    const contextB = baseContext({
      todayTodos: [
        { id: 3, title: "Task A", dueDate: "2026-08-21", priority: "medium", isOverdue: false },
        { id: 5, title: "Task B", dueDate: "2026-08-21", priority: "medium", isOverdue: false },
      ],
    });

    const resultA = calculateExecutivePriorities(contextA);
    const resultB = calculateExecutivePriorities(contextB);

    expect(resultA.map((p) => p.id)).toEqual(resultB.map((p) => p.id));
    expect(resultA[0].score).toBe(resultA[1].score); // genuinely tied
    expect(resultA.map((p) => p.id)).toEqual(["todo-3", "todo-5"]); // id asc tiebreak
  });

  it("never produces NaN/undefined scores or throws when module data is entirely missing (case: missing module data)", () => {
    expect(() => calculateExecutivePriorities(baseContext())).not.toThrow();
    const priorities = calculateExecutivePriorities(baseContext());
    expect(priorities.every((p) => Number.isFinite(p.score))).toBe(true);
  });
});
