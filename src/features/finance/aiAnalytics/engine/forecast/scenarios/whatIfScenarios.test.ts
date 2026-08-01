import { describe, expect, it } from "vitest";
import { simulateCancelSubscriptions, simulateIncreaseGoalSavings, simulateReduceCoffeeSpending, simulateReduceFoodSpending, simulateScenario } from "./whatIfScenarios";
import type { SubscriptionEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { Goal, GoalMilestoneEvent, Transaction } from "@/features/finance/types";
import type { WhatIfScenarioContext } from "@/features/finance/aiAnalytics/engine/forecast/types";

const now = new Date(2026, 6, 15);

function spendingAnalysis(topCategories: SpendingAnalysisResult["topCategories"]): SpendingAnalysisResult {
  return { topCategories, categoryComparison: [], monthlyTrend: [], dailyTrend: [], weekdayAnalysis: [], weeklyTrend: [], highestSpendingDay: null, mostExpensiveWeek: null };
}

function subscription(overrides: Partial<SubscriptionEntry>): SubscriptionEntry {
  return {
    normalizedTitle: "netflix",
    representativeTitle: "Netflix",
    category: "Entertainment",
    averageAmount: 200,
    occurrenceCount: 3,
    lastDate: "2026-07-01",
    averageIntervalDays: 30,
    lastAmount: 200,
    previousAmount: 200,
    ...overrides,
  };
}

describe("simulateReduceFoodSpending", () => {
  it("scales this month's Food spend by the reduction percent", () => {
    const result = simulateReduceFoodSpending(spendingAnalysis([{ category: "Food", amount: 2000, percentOfTotal: 40 }]), 20);
    expect(result.estimatedMonthlySavings).toBe(400);
    expect(result.estimatedYearlySavings).toBe(4800);
  });

  it("is zero when there's no Food category spend at all", () => {
    const result = simulateReduceFoodSpending(spendingAnalysis([]), 20);
    expect(result.estimatedMonthlySavings).toBe(0);
  });
});

describe("simulateCancelSubscriptions", () => {
  it("sums averageAmount for only the matched subscriptions", () => {
    const subscriptions = [subscription({ normalizedTitle: "netflix", averageAmount: 200 }), subscription({ normalizedTitle: "spotify", averageAmount: 150 })];
    const result = simulateCancelSubscriptions(subscriptions, ["netflix"]);
    expect(result.estimatedMonthlySavings).toBe(200);
    expect(result.estimatedYearlySavings).toBe(2400);
  });

  it("is zero when nothing matches", () => {
    const result = simulateCancelSubscriptions([subscription({ normalizedTitle: "netflix" })], ["not-a-real-subscription"]);
    expect(result.estimatedMonthlySavings).toBe(0);
  });
});

describe("simulateIncreaseGoalSavings", () => {
  function goal(overrides: Partial<Goal> = {}): Goal {
    return { name: "Vacation", targetAmount: 10000, currentAmount: 5000, syncId: "goal-1", ...overrides };
  }

  it("computes a completion date from the additional amount alone when there's no baseline pace", () => {
    const result = simulateIncreaseGoalSavings(goal(), [], 1000, now);
    expect(result.estimatedCompletionDate).not.toBeNull();
    // No baseline pace to compare against -> no meaningful "months saved".
    expect(result.monthsSaved).toBeNull();
  });

  it("reports monthsSaved when a real baseline pace exists", () => {
    const events: GoalMilestoneEvent[] = [
      { goalSyncId: "goal-1", goalName: "Vacation", tier: 25, reachedAt: "2026-01-01T00:00:00.000Z" },
      { goalSyncId: "goal-1", goalName: "Vacation", tier: 50, reachedAt: "2026-03-02T00:00:00.000Z" },
    ];
    const result = simulateIncreaseGoalSavings(goal(), events, 1000, now);
    expect(result.estimatedCompletionDate).not.toBeNull();
    expect(result.monthsSaved).not.toBeNull();
    expect(result.monthsSaved!).toBeGreaterThan(0); // extra savings should always shorten the timeline
  });

  it("is fully null once the goal is already complete", () => {
    const result = simulateIncreaseGoalSavings(goal({ targetAmount: 5000, currentAmount: 5000 }), [], 1000, now);
    expect(result.estimatedCompletionDate).toBeNull();
    expect(result.monthsSaved).toBeNull();
  });
});

function tx(overrides: Partial<Transaction>): Transaction {
  return { title: "x", amount: 0, type: "expense", account: "Cash", date: "2026-07-01", status: "completed", ...overrides };
}

describe("simulateReduceCoffeeSpending", () => {
  it("re-runs the real analyzer pipeline and reports a well-formed result shape", () => {
    const transactions: Transaction[] = [
      tx({ title: "Salary", amount: 30000, type: "income", category: "Salary", date: "2026-07-01" }),
      tx({ title: "Starbucks", amount: 500, category: "Food", date: "2026-07-05" }),
    ];
    const result = simulateReduceCoffeeSpending({ transactions, budgets: [], recipientProfiles: [], goalProgress: [], now }, 50);
    expect(result.type).toBe("reduceCoffeeSpending");
    if (result.baselineScore !== null && result.projectedScore !== null) {
      expect(result.estimatedScoreImprovement).toBeCloseTo(result.projectedScore - result.baselineScore, 5);
    } else {
      expect(result.estimatedScoreImprovement).toBeNull();
    }
  });
});

describe("simulateScenario dispatcher", () => {
  function scenarioContext(overrides: Partial<WhatIfScenarioContext> = {}): WhatIfScenarioContext {
    return {
      transactions: [],
      budgets: [],
      goals: [],
      goalMilestoneEvents: [],
      recipientProfiles: [],
      goalProgress: [],
      spendingAnalysis: spendingAnalysis([]),
      subscriptions: [],
      now,
      ...overrides,
    };
  }

  it("dispatches reduceFoodSpending", () => {
    const result = simulateScenario({ type: "reduceFoodSpending", reductionPercent: 20 }, scenarioContext());
    expect(result.type).toBe("reduceFoodSpending");
  });

  it("dispatches cancelSubscriptions", () => {
    const result = simulateScenario({ type: "cancelSubscriptions", normalizedTitles: ["netflix"] }, scenarioContext());
    expect(result.type).toBe("cancelSubscriptions");
  });

  it("dispatches reduceCoffeeSpending", () => {
    const result = simulateScenario({ type: "reduceCoffeeSpending", reductionPercent: 50 }, scenarioContext());
    expect(result.type).toBe("reduceCoffeeSpending");
  });

  it("dispatches increaseGoalSavings and resolves the goal by syncId", () => {
    const context = scenarioContext({ goals: [{ name: "Vacation", targetAmount: 10000, currentAmount: 5000, syncId: "goal-1" }] });
    const result = simulateScenario({ type: "increaseGoalSavings", goalSyncId: "goal-1", additionalMonthlyAmount: 1000 }, context);
    expect(result.type).toBe("increaseGoalSavings");
  });

  it("returns a fully-null increaseGoalSavings result when the goalSyncId doesn't match any goal", () => {
    const result = simulateScenario({ type: "increaseGoalSavings", goalSyncId: "missing", additionalMonthlyAmount: 1000 }, scenarioContext());
    expect(result).toEqual({ type: "increaseGoalSavings", estimatedCompletionDate: null, monthsSaved: null });
  });
});
