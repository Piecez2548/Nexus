import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";
import type { BudgetAnalysisResult, BudgetAnalysisEntry } from "./budgetAnalysis";
import type { BehaviorAnalysisResult } from "./behaviorAnalysis";
import type { CashFlowAnalysisResult } from "./cashFlowAnalysis";
import type { SpendingAnalysisResult } from "./spendingAnalysis";
import type { GoalMilestoneEvent, Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function emptyBudgets(): BudgetAnalysisResult {
  return { entries: [], overCount: 0, nearCount: 0, okCount: 0 };
}

function emptyBehavior(): BehaviorAnalysisResult {
  return {
    flags: [],
    largePurchases: [],
    topMerchants: [],
    subscriptions: [],
    impulsePurchases: [],
    mostActiveHour: { hour: null, dataQuality: "unavailable" },
    mostActiveWeekday: null,
  };
}

function emptyCashFlow(): CashFlowAnalysisResult {
  return {
    income: 0,
    expense: 0,
    saving: 0,
    savingRatePercent: null,
    netCashFlow: 0,
    changeVsPreviousMonth: { income: null, expense: null, saving: null },
    monthlyTrend: [],
  };
}

function emptySpending(overrides: Partial<SpendingAnalysisResult> = {}): SpendingAnalysisResult {
  return {
    topCategories: [],
    categoryComparison: [],
    monthlyTrend: [],
    dailyTrend: [],
    weekdayAnalysis: [],
    weeklyTrend: [],
    highestSpendingDay: null,
    mostExpensiveWeek: null,
    ...overrides,
  };
}

describe("buildTimeline", () => {
  it("returns an empty timeline with no data", () => {
    expect(buildTimeline([], emptyBudgets(), emptyBehavior(), emptyCashFlow(), emptySpending(), [], now)).toEqual([]);
  });

  it("flags a salary-keyword income transaction as a salaryReceived event", () => {
    const events = buildTimeline(
      [txn({ type: "income", category: "Salary", amount: 30000, date: "2026-07-01" })],
      emptyBudgets(),
      emptyBehavior(),
      emptyCashFlow(),
      emptySpending(),
      [],
      now
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "salaryReceived", date: "2026-07-01" });
  });

  it("does not flag a non-salary income transaction", () => {
    const events = buildTimeline(
      [txn({ type: "income", category: "Bonus", amount: 30000, date: "2026-07-01" })],
      emptyBudgets(),
      emptyBehavior(),
      emptyCashFlow(),
      emptySpending(),
      [],
      now
    );
    expect(events).toEqual([]);
  });

  it("finds the crossing date for an over-budget category by walking its in-period transactions", () => {
    const budgetEntry: BudgetAnalysisEntry = {
      budget: { id: 1, category: "Food", amount: 500, period: "monthly" },
      spent: 700,
      remaining: -200,
      percentage: 100,
      status: "over",
      suggestedMonthlyCap: 500,
      potentialMonthlySavings: 200,
    };
    const transactions = [
      txn({ amount: 300, date: "2026-07-05" }),
      txn({ amount: 300, date: "2026-07-10" }), // running total hits 600 here, crossing the 500 cap
      txn({ amount: 100, date: "2026-07-15" }),
    ];

    const events = buildTimeline(
      transactions,
      { entries: [budgetEntry], overCount: 1, nearCount: 0, okCount: 0 },
      emptyBehavior(),
      emptyCashFlow(),
      emptySpending(),
      [],
      now
    );
    const budgetEvent = events.find((e) => e.type === "budgetExceeded");
    expect(budgetEvent?.date).toBe("2026-07-10");
  });

  it("reuses behaviorAnalysis.largePurchases verbatim as largePurchase events", () => {
    const events = buildTimeline(
      [],
      emptyBudgets(),
      {
        ...emptyBehavior(),
        largePurchases: [{ id: 5, title: "Laptop", amount: 40000, category: "Shopping", date: "2026-07-03" }],
      },
      emptyCashFlow(),
      emptySpending(),
      [],
      now
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "largePurchase", date: "2026-07-03", params: { title: "Laptop", amount: 40000 } });
  });

  it("excludes the current in-progress month from monthlySummary events", () => {
    const cashFlow: CashFlowAnalysisResult = {
      ...emptyCashFlow(),
      monthlyTrend: [
        { monthKey: "2026-06", income: 1000, expense: 500, saving: 500, savingRatePercent: 50, netCashFlow: 500 },
        { monthKey: "2026-07", income: 1000, expense: 500, saving: 500, savingRatePercent: 50, netCashFlow: 500 },
      ],
    };
    const events = buildTimeline([], emptyBudgets(), emptyBehavior(), cashFlow, emptySpending(), [], now);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "monthlySummary", date: "2026-06-30" });
  });

  it("maps goalMilestoneEvents to savingMilestone events", () => {
    const milestone: GoalMilestoneEvent = { id: 1, goalSyncId: "g1", goalName: "MacBook", tier: 50, reachedAt: "2026-07-10T00:00:00.000Z" };
    const events = buildTimeline([], emptyBudgets(), emptyBehavior(), emptyCashFlow(), emptySpending(), [milestone], now);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "savingMilestone", date: "2026-07-10T00:00:00.000Z", params: { goalName: "MacBook", tier: 50 } });
  });

  it("sorts merged events most-recent-first", () => {
    const milestone: GoalMilestoneEvent = { id: 1, goalSyncId: "g1", goalName: "MacBook", tier: 50, reachedAt: "2026-07-01T00:00:00.000Z" };
    const events = buildTimeline(
      [txn({ type: "income", category: "Salary", amount: 30000, date: "2026-07-15" })],
      emptyBudgets(),
      emptyBehavior(),
      emptyCashFlow(),
      emptySpending(),
      [milestone],
      now
    );
    expect(events.map((e) => e.date)).toEqual(["2026-07-15", "2026-07-01T00:00:00.000Z"]);
  });

  it("reuses spendingAnalysis.highestSpendingDay verbatim as a highestSpendingDay event", () => {
    const events = buildTimeline(
      [],
      emptyBudgets(),
      emptyBehavior(),
      emptyCashFlow(),
      emptySpending({ highestSpendingDay: { date: "2026-07-06", amount: 900 } }),
      [],
      now
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "highestSpendingDay", date: "2026-07-06", params: { amount: 900 } });
  });

  it("omits highestSpendingDay when spendingAnalysis has none", () => {
    const events = buildTimeline([], emptyBudgets(), emptyBehavior(), emptyCashFlow(), emptySpending(), [], now);
    expect(events.some((e) => e.type === "highestSpendingDay")).toBe(false);
  });
});
