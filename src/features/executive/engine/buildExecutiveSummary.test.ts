import { describe, expect, it } from "vitest";
import { buildExecutiveSummary } from "./buildExecutiveSummary";
import type { ExecutiveContext, ExecutivePriorityItem } from "@/features/executive/types";

const NOW = new Date(2026, 7, 21);

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

function priority(overrides: Partial<ExecutivePriorityItem> = {}): ExecutivePriorityItem {
  return { id: "todo-1", category: "todo", title: "Item", score: 50, reasons: [], ...overrides };
}

describe("buildExecutiveSummary", () => {
  it("reports a light workload and no top priority for an empty system (case: empty system)", () => {
    const summary = buildExecutiveSummary(baseContext(), []);
    expect(summary.workloadLevel).toBe("light");
    expect(summary.topPriority).toBeNull();
    expect(summary.overdueCount).toBe(0);
    expect(summary.todayPriorityCount).toBe(0);
  });

  it("counts overdue todos directly from the context (case: overdue items)", () => {
    const context = baseContext({
      overdueTodos: [
        { id: 1, title: "A", dueDate: "2026-08-01", priority: "high", isOverdue: true },
        { id: 2, title: "B", dueDate: "2026-08-02", priority: "low", isOverdue: true },
      ],
    });
    const summary = buildExecutiveSummary(context, [priority(), priority({ id: "todo-2" })]);
    expect(summary.overdueCount).toBe(2);
  });

  it("counts at-risk goals separately from priority items (case: deadlines)", () => {
    const context = baseContext({
      goals: [
        { goal: { id: 1, name: "At risk", targetAmount: 1, currentAmount: 0, deadline: "2026-08-01" }, progressPercent: 0, isComplete: false, daysRemaining: -20, isAtRisk: true },
        { goal: { id: 2, name: "Fine", targetAmount: 1, currentAmount: 1, deadline: "2026-08-01" }, progressPercent: 100, isComplete: true, daysRemaining: -20, isAtRisk: false },
      ],
    });
    const summary = buildExecutiveSummary(context, []);
    expect(summary.atRiskGoalsCount).toBe(1);
  });

  it("picks the first (highest-scored) priority as topPriority (case: multiple priorities)", () => {
    const priorities = [priority({ id: "a", score: 90 }), priority({ id: "b", score: 40 })];
    const summary = buildExecutiveSummary(baseContext(), priorities);
    expect(summary.topPriority?.id).toBe("a");
  });

  it("escalates workload level as the priority count grows (case: normal day vs. high workload)", () => {
    const light = buildExecutiveSummary(baseContext(), [priority(), priority({ id: "2" })]);
    expect(light.workloadLevel).toBe("light");

    const moderate = buildExecutiveSummary(
      baseContext(),
      Array.from({ length: 5 }, (_, i) => priority({ id: String(i) }))
    );
    expect(moderate.workloadLevel).toBe("moderate");

    const high = buildExecutiveSummary(
      baseContext(),
      Array.from({ length: 6 }, (_, i) => priority({ id: String(i) }))
    );
    expect(high.workloadLevel).toBe("high");
  });

  it("is a pure function of its inputs -- same inputs always produce the same output (deterministic)", () => {
    const context = baseContext({ overdueTodos: [{ id: 1, title: "A", dueDate: "2026-08-01", priority: "high", isOverdue: true }] });
    const priorities = [priority()];

    const first = buildExecutiveSummary(context, priorities);
    const second = buildExecutiveSummary(context, priorities);
    expect(first).toEqual(second);
  });
});
