import { describe, expect, it } from "vitest";
import { generateRecommendations, type Recommendation } from "./recommendations";
import type { BudgetAnalysisResult, BudgetAnalysisEntry } from "./budgetAnalysis";
import type { BehaviorAnalysisResult, BehaviorFlag, TopMerchantEntry, SubscriptionEntry, ImpulsePurchaseEntry } from "./behaviorAnalysis";
import type { SpendingAnalysisResult, TopCategoryEntry, WeekdayAnalysisEntry } from "./spendingAnalysis";
import type { HealthScoreResult, HealthScoreSubScore } from "./healthScore";
import type { CashFlowAnalysisResult } from "./cashFlowAnalysis";
import type { ForecastResult } from "./forecast";
import type { TransactionStatistics } from "./transactionStatistics";
import { analyzeGoals } from "./goalAnalyzer";
import type { Transaction, Budget, Goal, GoalMilestoneEvent, RecipientProfile } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21

function budgetEntry(overrides: Partial<BudgetAnalysisEntry> = {}): BudgetAnalysisEntry {
  return {
    budget: { id: 1, category: "Food", amount: 1000, period: "monthly" },
    spent: 1000,
    remaining: 0,
    percentage: 100,
    status: "ok",
    suggestedMonthlyCap: null,
    potentialMonthlySavings: null,
    ...overrides,
  };
}

function budgets(entries: BudgetAnalysisEntry[] = []): BudgetAnalysisResult {
  return {
    entries,
    overCount: entries.filter((e) => e.status === "over").length,
    nearCount: entries.filter((e) => e.status === "near").length,
    okCount: entries.filter((e) => e.status === "ok").length,
  };
}

function flag(overrides: Partial<BehaviorFlag>): BehaviorFlag {
  return { key: "coffee", transactionCount: 0, totalAmount: 0, dataQuality: "full", ...overrides };
}

function topMerchant(overrides: Partial<TopMerchantEntry> = {}): TopMerchantEntry {
  return {
    alias: "Merchant",
    category: "Food",
    transactionCount: 1,
    totalAmount: 100,
    averagePurchase: 100,
    lastUsedDate: "2026-07-15",
    monthlyTrend: [],
    ...overrides,
  };
}

function subscriptionEntry(overrides: Partial<SubscriptionEntry> = {}): SubscriptionEntry {
  return {
    normalizedTitle: "streamflix",
    representativeTitle: "Streamflix",
    category: "Shopping",
    averageAmount: 199,
    occurrenceCount: 3,
    lastDate: "2026-07-01",
    averageIntervalDays: 30,
    lastAmount: 199,
    previousAmount: 199,
    ...overrides,
  };
}

function impulsePurchase(overrides: Partial<ImpulsePurchaseEntry> = {}): ImpulsePurchaseEntry {
  return { id: 1, title: "Item", amount: 500, category: "Shopping", date: "2026-07-10", reason: "aboveAverageNoBudget", ...overrides };
}

function weekdayEntry(overrides: Partial<WeekdayAnalysisEntry> = {}): WeekdayAnalysisEntry {
  const total = overrides.total ?? 0;
  const count = overrides.count ?? 0;
  return { weekday: 0, total, count, average: count > 0 ? total / count : 0, ...overrides };
}

// Full 7-entry array (all days present, zeroed) so tests can override just
// the days they care about, matching computeWeekdayAnalysis's real shape.
function allWeekdaysZero(): WeekdayAnalysisEntry[] {
  return Array.from({ length: 7 }, (_, weekday) => weekdayEntry({ weekday }));
}

// Accepts either the original shorthand (a flags array) or a full-result
// overrides object, so tests exercising topMerchants/subscriptions/
// impulsePurchases don't need a second helper.
function behavior(overrides: Partial<BehaviorAnalysisResult> | BehaviorFlag[] = []): BehaviorAnalysisResult {
  const base: BehaviorAnalysisResult = {
    flags: [],
    largePurchases: [],
    topMerchants: [],
    subscriptions: [],
    impulsePurchases: [],
    mostActiveHour: { hour: null, dataQuality: "unavailable" },
    mostActiveWeekday: null,
  };
  if (Array.isArray(overrides)) return { ...base, flags: overrides };
  return { ...base, ...overrides };
}

// Same shorthand-or-overrides flexibility as behavior() above.
function spending(overrides: Partial<SpendingAnalysisResult> | TopCategoryEntry[] = []): SpendingAnalysisResult {
  const base: SpendingAnalysisResult = {
    topCategories: [],
    categoryComparison: [],
    monthlyTrend: [],
    dailyTrend: [],
    weekdayAnalysis: [],
    weeklyTrend: [],
    highestSpendingDay: null,
    mostExpensiveWeek: null,
  };
  if (Array.isArray(overrides)) return { ...base, topCategories: overrides };
  return { ...base, ...overrides };
}

function savingRateSubScore(value: number | null): HealthScoreSubScore {
  return { key: "savingRate", score: value, value };
}

function healthScore(savingRateValue: number | null = null, grade: HealthScoreResult["grade"] = null): HealthScoreResult {
  return { score: null, grade, insufficientData: false, subScores: [savingRateSubScore(savingRateValue)] };
}

function cashFlow(income = 0, expense = 0, overrides: Partial<CashFlowAnalysisResult> = {}): CashFlowAnalysisResult {
  return {
    income,
    expense,
    saving: income - expense,
    savingRatePercent: null,
    netCashFlow: income - expense,
    changeVsPreviousMonth: { income: null, expense: null, saving: null },
    monthlyTrend: [],
    ...overrides,
  };
}

function monthPoint(overrides: Partial<CashFlowAnalysisResult["monthlyTrend"][number]> = {}) {
  return { monthKey: "2026-07", income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, ...overrides };
}

function forecastResult(overrides: Partial<ForecastResult> = {}): ForecastResult {
  return {
    expectedEndOfMonthBalance: 0,
    expectedSavings: 0,
    budgetOverflowRisk: [],
    futureCashFlowTrend: { basis: "insufficientData", projectedMonthlyNet: null },
    ...overrides,
  };
}

function statistics(): TransactionStatistics {
  return { averageDailySpending: 0, averageWeeklySpending: 0, averageMonthlySpending: 0, averageTransaction: 0, largestTransaction: null, smallestTransaction: null };
}

// The rule registry needs more context than these 5 analyzer results (raw
// transactions/budgets, forecast, transactionStatistics, now) — every rule
// exercised by this file only reads the first 5, so the rest are stubbed
// with empty/zeroed defaults here rather than repeated at every call site.
function run(
  budgetAnalysis: BudgetAnalysisResult,
  behaviorAnalysis: BehaviorAnalysisResult,
  spendingAnalysis: SpendingAnalysisResult,
  health: HealthScoreResult,
  cashFlowAnalysis: CashFlowAnalysisResult,
  extra: {
    transactions?: Transaction[];
    rawBudgets?: Budget[];
    goals?: Goal[];
    goalMilestoneEvents?: GoalMilestoneEvent[];
    recipientProfiles?: RecipientProfile[];
    forecast?: ForecastResult;
  } = {}
): Recommendation[] {
  const goals = extra.goals ?? [];
  const goalMilestoneEvents = extra.goalMilestoneEvents ?? [];
  return generateRecommendations(
    budgetAnalysis,
    behaviorAnalysis,
    spendingAnalysis,
    health,
    cashFlowAnalysis,
    extra.transactions ?? [],
    extra.rawBudgets ?? [],
    extra.forecast ?? forecastResult(),
    statistics(),
    goals,
    goalMilestoneEvents,
    analyzeGoals(goals, goalMilestoneEvents, now),
    extra.recipientProfiles ?? [],
    now
  );
}

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

describe("generateRecommendations", () => {
  it("returns nothing with no reducible signal at all", () => {
    expect(run(budgets(), behavior(), spending(), healthScore(), cashFlow())).toEqual([]);
  });

  it("recommends reducing an over-budget category with its exact potential savings, and includes title/reason/action", () => {
    const result = run(budgets([budgetEntry({ status: "over", spent: 1900, remaining: -900, potentialMonthlySavings: 900 })]), behavior(), spending(), healthScore(), cashFlow());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ key: "reduceOverBudgetCategory", estimatedMonthlySavings: 900, priority: "medium" });
    expect(result[0].title).toEqual({ key: "aiAnalytics.recommendations.titles.reduceOverBudgetCategory", params: { category: "Food" } });
    expect(result[0].reason).toEqual({ key: "aiAnalytics.recommendations.reasons.reduceOverBudgetCategory", params: { category: "Food", overAmount: 900 } });
    expect(result[0].action.key).toBe("aiAnalytics.recommendations.actions.reduceOverBudgetCategory");
  });

  it("recommends reducing convenienceStore spending unconditionally, but not coffee/eatingOut below their visit thresholds", () => {
    const result = run(
      budgets(),
      behavior([
        flag({ key: "convenienceStore", totalAmount: 1000, transactionCount: 3 }),
        flag({ key: "coffee", totalAmount: 5000, transactionCount: 5 }), // below the 10-visit threshold
        flag({ key: "eatingOut", totalAmount: 5000, transactionCount: 5 }), // below the 20-visit threshold
        flag({ key: "weekendSpending", totalAmount: 5000 }),
        flag({ key: "nightSpending", totalAmount: 5000 }),
      ]),
      spending(),
      healthScore(),
      cashFlow()
    );
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("reduceBehaviorSpending");
    expect(result[0].params.behavior).toBe("convenienceStore");
    expect(result[0].estimatedMonthlySavings).toBe(300); // 30% of 1000
    expect(result[0].title.key).toBe("aiAnalytics.recommendations.reduce.convenienceStore");
  });

  it("skips convenienceStore when its spend is zero", () => {
    const result = run(budgets(), behavior([flag({ key: "convenienceStore", totalAmount: 0 })]), spending(), healthScore(), cashFlow());
    expect(result).toEqual([]);
  });

  describe("reduceRestaurantVisits", () => {
    it("does not fire at exactly the 20-visit threshold", () => {
      const result = run(budgets(), behavior([flag({ key: "eatingOut", totalAmount: 5000, transactionCount: 20 })]), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "reduceRestaurantVisits")).toBe(false);
    });

    it("fires above the 20-visit threshold", () => {
      const result = run(budgets(), behavior([flag({ key: "eatingOut", totalAmount: 5000, transactionCount: 21 })]), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "reduceRestaurantVisits");
      expect(rec).toMatchObject({ params: { count: 21 }, estimatedMonthlySavings: 1500 });
    });
  });

  describe("reduceCoffeeVisits", () => {
    it("does not fire at exactly the 10-visit threshold", () => {
      const result = run(budgets(), behavior([flag({ key: "coffee", totalAmount: 2000, transactionCount: 10 })]), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "reduceCoffeeVisits")).toBe(false);
    });

    it("fires above the 10-visit threshold", () => {
      const result = run(budgets(), behavior([flag({ key: "coffee", totalAmount: 2000, transactionCount: 11 })]), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "reduceCoffeeVisits");
      expect(rec).toMatchObject({ params: { count: 11 }, estimatedMonthlySavings: 600 });
    });
  });

  describe("reduceCategoryOverspend", () => {
    it("does not fire at exactly 40% share", () => {
      const result = run(budgets(), behavior(), spending([{ category: "Food", amount: 4000, percentOfTotal: 40 }]), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "reduceCategoryOverspend")).toBe(false);
    });

    it("fires above 40% share", () => {
      const result = run(budgets(), behavior(), spending([{ category: "Food", amount: 4000, percentOfTotal: 41 }]), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "reduceCategoryOverspend");
      expect(rec).toMatchObject({ params: { category: "Food", percent: 41 } });
    });

    it("is skipped for a category that already produced a reduceOverBudgetCategory recommendation", () => {
      const result = run(
        budgets([budgetEntry({ status: "over", potentialMonthlySavings: 900 })]),
        behavior(),
        spending([{ category: "Food", amount: 4000, percentOfTotal: 60 }]),
        healthScore(),
        cashFlow()
      );
      expect(result.filter((r) => r.key === "reduceOverBudgetCategory")).toHaveLength(1);
      expect(result.some((r) => r.key === "reduceCategoryOverspend")).toBe(false);
    });
  });

  describe("increaseSavingRate", () => {
    it("does not fire when the saving rate is at or above the 20% target", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(20), cashFlow(10000));
      expect(result.some((r) => r.key === "increaseSavingRate")).toBe(false);
    });

    it("does not fire when there's no saving-rate data or no income", () => {
      const noData = run(budgets(), behavior(), spending(), healthScore(null), cashFlow(10000));
      expect(noData.some((r) => r.key === "increaseSavingRate")).toBe(false);

      const noIncome = run(budgets(), behavior(), spending(), healthScore(5), cashFlow(0));
      expect(noIncome.some((r) => r.key === "increaseSavingRate")).toBe(false);
    });

    it("fires within the 10-20% band with the shortfall to 20% as estimated savings", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(15), cashFlow(10000));
      const rec = result.find((r) => r.key === "increaseSavingRate");
      // Target: 20% of 10000 = 2000. Current: 15% of 10000 = 1500. Shortfall: 500.
      expect(rec).toMatchObject({ estimatedMonthlySavings: 500, params: { currentRate: 15, targetRate: 20 } });
    });

    it("does not fire below the 10% band — that's savingRateCritical's job instead", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(5), cashFlow(10000));
      expect(result.some((r) => r.key === "increaseSavingRate")).toBe(false);
    });
  });

  describe("savingRateCritical", () => {
    it("does not fire at or above the 10% threshold", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(10), cashFlow(10000));
      expect(result.some((r) => r.key === "savingRateCritical")).toBe(false);
    });

    it("fires below 10% with critical priority and the shortfall to 20% as estimated savings", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(5), cashFlow(10000));
      const rec = result.find((r) => r.key === "savingRateCritical");
      // Target: 20% of 10000 = 2000. Current: 5% of 10000 = 500. Shortfall: 1500.
      expect(rec).toMatchObject({ priority: "critical", estimatedMonthlySavings: 1500, params: { currentRate: 5, threshold: 10 } });
    });

    it("does not fire without income or saving-rate data", () => {
      expect(run(budgets(), behavior(), spending(), healthScore(null), cashFlow(10000)).some((r) => r.key === "savingRateCritical")).toBe(false);
      expect(run(budgets(), behavior(), spending(), healthScore(5), cashFlow(0)).some((r) => r.key === "savingRateCritical")).toBe(false);
    });
  });

  describe("expenseRatioHigh", () => {
    function withExpenseRatio(value: number | null): HealthScoreResult {
      return { score: null, grade: null, insufficientData: false, subScores: [{ key: "expenseRatio", score: null, value }] };
    }

    it("does not fire at or below 80%", () => {
      const result = run(budgets(), behavior(), spending(), withExpenseRatio(0.8), cashFlow());
      expect(result.some((r) => r.key === "expenseRatioHigh")).toBe(false);
    });

    it("fires above 80% with the percent in its params", () => {
      const result = run(budgets(), behavior(), spending(), withExpenseRatio(0.92), cashFlow());
      const rec = result.find((r) => r.key === "expenseRatioHigh");
      expect(rec).toMatchObject({ priority: "high", params: { percent: 92 } });
    });
  });

  describe("incomeGrowthNegative", () => {
    it("does not fire when income is flat or growing", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), { ...cashFlow(), changeVsPreviousMonth: { income: 5, expense: null, saving: null } });
      expect(result.some((r) => r.key === "incomeGrowthNegative")).toBe(false);
    });

    it("fires when income is down vs. last month", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), { ...cashFlow(), changeVsPreviousMonth: { income: -12, expense: null, saving: null } });
      const rec = result.find((r) => r.key === "incomeGrowthNegative");
      expect(rec).toMatchObject({ priority: "high", params: { percent: 12 } });
    });
  });

  describe("budgetNear90", () => {
    it("does not fire below 90% utilization", () => {
      const result = run(budgets([budgetEntry({ status: "near", percentage: 85 })]), behavior(), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "budgetNear90")).toBe(false);
    });

    it("does not fire once the budget is already over", () => {
      const result = run(budgets([budgetEntry({ status: "over", percentage: 100, potentialMonthlySavings: 100 })]), behavior(), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "budgetNear90")).toBe(false);
    });

    it("fires at 90%+ utilization while still under the cap", () => {
      const result = run(budgets([budgetEntry({ status: "near", percentage: 92 })]), behavior(), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "budgetNear90");
      expect(rec).toMatchObject({ priority: "low", params: { category: "Food", percent: 92 } });
    });
  });

  describe("underutilizedBudget", () => {
    it("does not fire at or above 20% utilization", () => {
      const result = run(budgets([budgetEntry({ status: "ok", percentage: 20 })]), behavior(), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "underutilizedBudget")).toBe(false);
    });

    it("fires under 20% utilization", () => {
      const result = run(budgets([budgetEntry({ status: "ok", percentage: 12 })]), behavior(), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "underutilizedBudget");
      expect(rec).toMatchObject({ priority: "information", params: { category: "Food", percent: 12 } });
    });
  });

  describe("repeatedBudgetOverflow", () => {
    it("does not fire when the budget was only over once in the trailing window", () => {
      const rawBudgets: Budget[] = [{ id: 1, category: "Food", amount: 1000, period: "monthly" }];
      const transactions = [txn({ amount: 500, date: "2026-06-10" }), txn({ amount: 1200, date: "2026-07-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions, rawBudgets });
      expect(result.some((r) => r.key === "repeatedBudgetOverflow")).toBe(false);
    });

    it("fires when the budget was over for 2 consecutive trailing months", () => {
      const rawBudgets: Budget[] = [{ id: 1, category: "Food", amount: 1000, period: "monthly" }];
      const transactions = [txn({ amount: 500, date: "2026-05-10" }), txn({ amount: 1200, date: "2026-06-10" }), txn({ amount: 1200, date: "2026-07-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions, rawBudgets });
      const rec = result.find((r) => r.key === "repeatedBudgetOverflow");
      expect(rec).toMatchObject({ priority: "high", estimatedMonthlySavings: 200, params: { category: "Food", months: 2 } });
    });

    it("skips non-monthly budgets", () => {
      const rawBudgets: Budget[] = [{ id: 1, category: "Food", amount: 1000, period: "yearly" }];
      const transactions = [txn({ amount: 1200, date: "2026-06-10" }), txn({ amount: 1200, date: "2026-07-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions, rawBudgets });
      expect(result.some((r) => r.key === "repeatedBudgetOverflow")).toBe(false);
    });
  });

  describe("goal rules", () => {
    function goal(overrides: Partial<Goal> = {}): Goal {
      return { id: 1, syncId: "goal-1", name: "MacBook", targetAmount: 1000, currentAmount: 0, ...overrides };
    }

    it("fires goalBehindSchedule when the deadline has passed and the goal isn't complete", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        goals: [goal({ deadline: "2026-07-01", currentAmount: 300, targetAmount: 1000 })],
      });
      const rec = result.find((r) => r.key === "goalBehindSchedule");
      expect(rec).toMatchObject({ priority: "high", params: { goalName: "MacBook", remainingAmount: 700 } });
    });

    it("does not fire goalBehindSchedule before the deadline", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        goals: [goal({ deadline: "2026-12-31", currentAmount: 300, targetAmount: 1000 })],
      });
      expect(result.some((r) => r.key === "goalBehindSchedule")).toBe(false);
    });

    it("fires goalCompleted once the target is reached", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        goals: [goal({ currentAmount: 1000, targetAmount: 1000 })],
      });
      const rec = result.find((r) => r.key === "goalCompleted");
      expect(rec).toMatchObject({ priority: "information", params: { goalName: "MacBook", targetAmount: 1000 } });
    });

    it("fires goalNearlyComplete at 90%+ progress but not yet complete", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        goals: [goal({ currentAmount: 950, targetAmount: 1000 })],
      });
      const rec = result.find((r) => r.key === "goalNearlyComplete");
      expect(rec).toMatchObject({ params: { goalName: "MacBook", percent: 95 } });
      expect(result.some((r) => r.key === "goalCompleted")).toBe(false);
    });

    it("fires goalAcceleration when 2+ milestones are crossed within the current month", () => {
      const milestoneEvents: GoalMilestoneEvent[] = [
        { id: 1, goalSyncId: "goal-1", goalName: "MacBook", tier: 25, reachedAt: "2026-07-05T00:00:00.000Z" },
        { id: 2, goalSyncId: "goal-1", goalName: "MacBook", tier: 50, reachedAt: "2026-07-15T00:00:00.000Z" },
      ];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        goals: [goal({ currentAmount: 500, targetAmount: 1000 })],
        goalMilestoneEvents: milestoneEvents,
      });
      const rec = result.find((r) => r.key === "goalAcceleration");
      expect(rec).toMatchObject({ params: { goalName: "MacBook", milestones: 2 } });
    });

    it("does not fire goalAcceleration for a single milestone this month", () => {
      const milestoneEvents: GoalMilestoneEvent[] = [{ id: 1, goalSyncId: "goal-1", goalName: "MacBook", tier: 25, reachedAt: "2026-07-05T00:00:00.000Z" }];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        goals: [goal({ currentAmount: 300, targetAmount: 1000 })],
        goalMilestoneEvents: milestoneEvents,
      });
      expect(result.some((r) => r.key === "goalAcceleration")).toBe(false);
    });
  });

  describe("foodShareCritical", () => {
    it("does not fire at exactly 50% share", () => {
      const result = run(budgets(), behavior(), spending([{ category: "Food", amount: 5000, percentOfTotal: 50 }]), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "foodShareCritical")).toBe(false);
    });

    it("fires above 50% share, and suppresses the generic reduceCategoryOverspend for Food", () => {
      const result = run(budgets(), behavior(), spending([{ category: "Food", amount: 5000, percentOfTotal: 55 }]), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "foodShareCritical");
      expect(rec).toMatchObject({ priority: "high", params: { percent: 55 } });
      expect(result.some((r) => r.key === "reduceCategoryOverspend")).toBe(false);
    });
  });

  describe("foodIncreasingTrend", () => {
    it("fires when Food spending has increased for 3 consecutive trailing months", () => {
      const transactions = [
        txn({ amount: 100, category: "Food", date: "2026-05-10" }),
        txn({ amount: 200, category: "Food", date: "2026-06-10" }),
        txn({ amount: 300, category: "Food", date: "2026-07-10" }),
      ];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "foodIncreasingTrend");
      expect(rec).toMatchObject({ priority: "medium", params: { months: 3 } });
    });

    it("does not fire when the increase breaks partway through the window", () => {
      const transactions = [
        txn({ amount: 300, category: "Food", date: "2026-05-10" }),
        txn({ amount: 100, category: "Food", date: "2026-06-10" }),
        txn({ amount: 300, category: "Food", date: "2026-07-10" }),
      ];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      expect(result.some((r) => r.key === "foodIncreasingTrend")).toBe(false);
    });
  });

  describe("restaurantVisitsCritical", () => {
    it("does not fire at exactly the 30-visit threshold", () => {
      const result = run(budgets(), behavior([flag({ key: "eatingOut", totalAmount: 5000, transactionCount: 30 })]), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "restaurantVisitsCritical")).toBe(false);
    });

    it("fires above the 30-visit threshold, and suppresses reduceRestaurantVisits", () => {
      const result = run(budgets(), behavior([flag({ key: "eatingOut", totalAmount: 5000, transactionCount: 31 })]), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "restaurantVisitsCritical");
      expect(rec).toMatchObject({ priority: "critical", params: { count: 31 } });
      expect(result.some((r) => r.key === "reduceRestaurantVisits")).toBe(false);
    });
  });

  describe("averageMealCostIncreasing", () => {
    it("fires when the average Food purchase rose 10%+ across two trailing 3-month halves", () => {
      const transactions = [txn({ amount: 100, category: "Food", date: "2026-03-10" }), txn({ amount: 150, category: "Food", date: "2026-06-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "averageMealCostIncreasing");
      expect(rec).toMatchObject({ priority: "information", params: { percent: 50, previousAverage: 100, currentAverage: 150 } });
    });

    it("does not fire when the average is flat or falling", () => {
      const transactions = [txn({ amount: 150, category: "Food", date: "2026-03-10" }), txn({ amount: 100, category: "Food", date: "2026-06-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      expect(result.some((r) => r.key === "averageMealCostIncreasing")).toBe(false);
    });
  });

  describe("coffeeAboveMonthlyAverage", () => {
    it("fires when this month's coffee spend is 20%+ above the trailing average", () => {
      const transactions = [txn({ title: "Iced Coffee", amount: 100, category: "Food", date: "2026-02-10" }), txn({ title: "Iced Coffee", amount: 100, category: "Food", date: "2026-07-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "coffeeAboveMonthlyAverage");
      // 5-month prior average = 100/5 = 20. Current month = 100. +400%.
      expect(rec).toMatchObject({ priority: "medium", estimatedMonthlySavings: 80, params: { percent: 400 } });
    });

    it("does not fire when there's no coffee spend at all", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions: [] });
      expect(result.some((r) => r.key === "coffeeAboveMonthlyAverage")).toBe(false);
    });
  });

  describe("shoppingGrowthHigh", () => {
    it("does not fire at exactly 30% growth", () => {
      const result = run(budgets(), behavior(), spending({ categoryComparison: [{ category: "Shopping", current: 1300, previous: 1000, changePercent: 30 }] }), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "shoppingGrowthHigh")).toBe(false);
    });

    it("fires above 30% growth", () => {
      const result = run(budgets(), behavior(), spending({ categoryComparison: [{ category: "Shopping", current: 1310, previous: 1000, changePercent: 31 }] }), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "shoppingGrowthHigh");
      expect(rec).toMatchObject({ priority: "medium", params: { percent: 31 } });
    });
  });

  describe("impulsePurchases", () => {
    it("does not fire for a single impulse purchase", () => {
      const result = run(budgets(), behavior({ impulsePurchases: [impulsePurchase({ amount: 500 })] }), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "impulsePurchases")).toBe(false);
    });

    it("fires for 2+ impulse purchases with 30% of the total as estimated savings", () => {
      const result = run(
        budgets(),
        behavior({ impulsePurchases: [impulsePurchase({ amount: 500 }), impulsePurchase({ id: 2, amount: 500 })] }),
        spending(),
        healthScore(),
        cashFlow()
      );
      const rec = result.find((r) => r.key === "impulsePurchases");
      expect(rec).toMatchObject({ estimatedMonthlySavings: 300, params: { count: 2, amount: 1000 } });
    });
  });

  describe("weekendShopping", () => {
    it("fires when the average weekend Shopping purchase exceeds the weekday one", () => {
      const transactions = [
        txn({ category: "Shopping", amount: 1000, date: "2026-07-18" }), // Saturday
        txn({ category: "Shopping", amount: 100, date: "2026-07-15" }), // Wednesday
      ];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "weekendShopping");
      expect(rec).toMatchObject({ priority: "information", params: { weekendAverage: 1000, weekdayAverage: 100 } });
    });

    it("does not fire when there's no weekend or no weekday Shopping data", () => {
      const transactions = [txn({ category: "Shopping", amount: 1000, date: "2026-07-15" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      expect(result.some((r) => r.key === "weekendShopping")).toBe(false);
    });
  });

  describe("merchantDependency", () => {
    it("does not fire with fewer than 2 merchants", () => {
      const result = run(budgets(), behavior({ topMerchants: [topMerchant({ alias: "A", totalAmount: 800 })] }), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "merchantDependency")).toBe(false);
    });

    it("fires when the top merchant exceeds 25% share among the top merchants", () => {
      const result = run(
        budgets(),
        behavior({ topMerchants: [topMerchant({ alias: "A", totalAmount: 800 }), topMerchant({ alias: "B", totalAmount: 200 })] }),
        spending(),
        healthScore(),
        cashFlow()
      );
      const rec = result.find((r) => r.key === "merchantDependency");
      expect(rec).toMatchObject({ params: { merchant: "A", percent: 80 } });
    });
  });

  describe("fastestGrowingMerchant", () => {
    it("fires for a merchant growing 50%+ month-over-month", () => {
      const result = run(
        budgets(),
        behavior({
          topMerchants: [
            topMerchant({
              alias: "A",
              monthlyTrend: [
                { monthKey: "2026-06", amount: 100 },
                { monthKey: "2026-07", amount: 200 },
              ],
            }),
          ],
        }),
        spending(),
        healthScore(),
        cashFlow()
      );
      const rec = result.find((r) => r.key === "fastestGrowingMerchant");
      expect(rec).toMatchObject({ params: { merchant: "A", percent: 100 } });
    });

    it("does not fire below the 50% growth threshold", () => {
      const result = run(
        budgets(),
        behavior({
          topMerchants: [
            topMerchant({
              alias: "A",
              monthlyTrend: [
                { monthKey: "2026-06", amount: 100 },
                { monthKey: "2026-07", amount: 120 },
              ],
            }),
          ],
        }),
        spending(),
        healthScore(),
        cashFlow()
      );
      expect(result.some((r) => r.key === "fastestGrowingMerchant")).toBe(false);
    });
  });

  describe("manySubscriptions", () => {
    it("does not fire with fewer than 3 subscriptions", () => {
      const result = run(budgets(), behavior({ subscriptions: [subscriptionEntry(), subscriptionEntry()] }), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "manySubscriptions")).toBe(false);
    });

    it("fires with 3+ subscriptions and their combined total", () => {
      const result = run(
        budgets(),
        behavior({ subscriptions: [subscriptionEntry({ averageAmount: 100 }), subscriptionEntry({ averageAmount: 200 }), subscriptionEntry({ averageAmount: 300 })] }),
        spending(),
        healthScore(),
        cashFlow()
      );
      const rec = result.find((r) => r.key === "manySubscriptions");
      expect(rec).toMatchObject({ params: { count: 3, total: 600 } });
    });
  });

  describe("subscriptionPriceIncrease", () => {
    it("does not fire below the 5% rise threshold", () => {
      const result = run(budgets(), behavior({ subscriptions: [subscriptionEntry({ previousAmount: 100, lastAmount: 103 })] }), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "subscriptionPriceIncrease")).toBe(false);
    });

    it("fires at or above a 5% rise, with the ฿ increase as estimated savings", () => {
      const result = run(
        budgets(),
        behavior({ subscriptions: [subscriptionEntry({ representativeTitle: "Streamflix", previousAmount: 100, lastAmount: 110 })] }),
        spending(),
        healthScore(),
        cashFlow()
      );
      const rec = result.find((r) => r.key === "subscriptionPriceIncrease");
      expect(rec).toMatchObject({ estimatedMonthlySavings: 10, params: { title: "Streamflix", percent: 10 } });
    });
  });

  describe("transportAboveAverage", () => {
    it("fires when this month's transport spend is 20%+ above the trailing average", () => {
      const transactions = [txn({ title: "Grab ride", amount: 100, category: "Transport", date: "2026-02-10" }), txn({ title: "Grab ride", amount: 100, category: "Transport", date: "2026-07-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "transportAboveAverage");
      // 5-month prior average = 100/5 = 20. Current month = 100. +400%.
      expect(rec).toMatchObject({ priority: "medium", estimatedMonthlySavings: 80, params: { percent: 400 } });
    });

    it("does not fire with no transport spend", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions: [] });
      expect(result.some((r) => r.key === "transportAboveAverage")).toBe(false);
    });
  });

  describe("rideHailingDependency", () => {
    it("does not fire at exactly the 15-trip threshold", () => {
      const transactions = Array.from({ length: 15 }, (_, i) => txn({ title: "Grab ride", amount: 80, category: "Transport", date: `2026-07-${String(i + 1).padStart(2, "0")}` }));
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      expect(result.some((r) => r.key === "rideHailingDependency")).toBe(false);
    });

    it("fires above the 15-trip threshold", () => {
      const transactions = Array.from({ length: 16 }, (_, i) => txn({ title: "Grab ride", amount: 80, category: "Transport", date: `2026-07-${String(i + 1).padStart(2, "0")}` }));
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "rideHailingDependency");
      expect(rec).toMatchObject({ priority: "medium", estimatedMonthlySavings: Math.round(16 * 80 * 0.3), params: { count: 16 } });
    });
  });

  describe("negativeCashFlow", () => {
    it("does not fire when net cash flow is zero or positive", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(1000, 1000));
      expect(result.some((r) => r.key === "negativeCashFlow")).toBe(false);
    });

    it("fires with the deficit as estimated savings", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(1000, 1500));
      const rec = result.find((r) => r.key === "negativeCashFlow");
      expect(rec).toMatchObject({ priority: "high", estimatedMonthlySavings: 500, params: { deficit: 500 } });
    });
  });

  describe("repeatedNegativeCashFlow", () => {
    it("does not fire with only 2 consecutive negative months", () => {
      const monthlyTrend = [monthPoint({ netCashFlow: 100 }), monthPoint({ netCashFlow: -100 }), monthPoint({ netCashFlow: -200 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }));
      expect(result.some((r) => r.key === "repeatedNegativeCashFlow")).toBe(false);
    });

    it("fires critical with 3+ consecutive negative months", () => {
      const monthlyTrend = [monthPoint({ netCashFlow: -50 }), monthPoint({ netCashFlow: -100 }), monthPoint({ netCashFlow: -200 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }));
      const rec = result.find((r) => r.key === "repeatedNegativeCashFlow");
      expect(rec).toMatchObject({ priority: "critical", estimatedMonthlySavings: 200, params: { months: 3 } });
    });
  });

  describe("expenseSpike", () => {
    it("fires when this month's expense is 50%+ above the trailing average", () => {
      const monthlyTrend = [monthPoint({ expense: 1000 }), monthPoint({ expense: 1000 }), monthPoint({ expense: 2000 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }));
      const rec = result.find((r) => r.key === "expenseSpike");
      expect(rec).toMatchObject({ priority: "high", estimatedMonthlySavings: 1000, params: { percent: 100 } });
    });

    it("does not fire below the 50% threshold", () => {
      const monthlyTrend = [monthPoint({ expense: 1000 }), monthPoint({ expense: 1000 }), monthPoint({ expense: 1300 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }));
      expect(result.some((r) => r.key === "expenseSpike")).toBe(false);
    });
  });

  describe("lateNightSpending", () => {
    it("does not fire below 3 night transactions", () => {
      const result = run(budgets(), behavior([flag({ key: "nightSpending", transactionCount: 2, totalAmount: 600, dataQuality: "full" })]), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "lateNightSpending")).toBe(false);
    });

    it("fires at 3+ night transactions, with lower confidence on thin data", () => {
      const result = run(budgets(), behavior([flag({ key: "nightSpending", transactionCount: 5, totalAmount: 1000, dataQuality: "thin" })]), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "lateNightSpending");
      expect(rec).toMatchObject({ confidence: "low", params: { count: 5, amount: 1000 } });
    });
  });

  describe("weekendOverspending (recommendation)", () => {
    it("fires when the weekend per-transaction average exceeds the weekday one", () => {
      const weekdayAnalysis = allWeekdaysZero();
      weekdayAnalysis[0] = weekdayEntry({ weekday: 0, total: 1000, count: 2 });
      weekdayAnalysis[1] = weekdayEntry({ weekday: 1, total: 500, count: 5 });
      const result = run(budgets(), behavior(), spending({ weekdayAnalysis }), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "weekendOverspending");
      expect(rec).toMatchObject({ params: { weekendAverage: 500, weekdayAverage: 100 } });
    });

    it("does not fire when the weekend average is at or below the weekday average", () => {
      const weekdayAnalysis = allWeekdaysZero();
      weekdayAnalysis[0] = weekdayEntry({ weekday: 0, total: 200, count: 2 });
      weekdayAnalysis[1] = weekdayEntry({ weekday: 1, total: 500, count: 5 });
      const result = run(budgets(), behavior(), spending({ weekdayAnalysis }), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "weekendOverspending")).toBe(false);
    });
  });

  describe("largeSpendingAfterSalary", () => {
    it("fires when a large expense follows a salary-keyword income within 3 days", () => {
      const transactions = [
        txn({ type: "income", category: "Salary", title: "Salary", amount: 30000, date: "2026-07-01" }),
        txn({ type: "expense", title: "New phone", amount: 10000, date: "2026-07-03" }),
      ];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "largeSpendingAfterSalary");
      expect(rec).toMatchObject({ params: { amount: 10000, days: 3 } });
    });

    it("does not fire when the large expense happens well after the salary window", () => {
      const transactions = [
        txn({ type: "income", category: "Salary", title: "Salary", amount: 30000, date: "2026-07-01" }),
        txn({ type: "expense", title: "New phone", amount: 10000, date: "2026-07-10" }),
      ];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      expect(result.some((r) => r.key === "largeSpendingAfterSalary")).toBe(false);
    });
  });

  describe("noSpendingStreak", () => {
    it("fires for 5+ consecutive no-expense days within the current month", () => {
      const transactions = [txn({ type: "expense", amount: 100, date: "2026-07-10" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      const rec = result.find((r) => r.key === "noSpendingStreak");
      expect(rec).toMatchObject({ params: { days: 11 } }); // 07-11 through 07-21
    });

    it("does not fire below a 5-day streak", () => {
      const transactions = [txn({ type: "expense", amount: 100, date: "2026-07-20" })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), { transactions });
      expect(result.some((r) => r.key === "noSpendingStreak")).toBe(false);
    });
  });

  describe("forecastBudgetOverflow", () => {
    it("fires per at-risk budget with the projected overage as estimated savings", () => {
      const result = run(
        budgets([budgetEntry({ status: "near", percentage: 85 })]),
        behavior(),
        spending(),
        healthScore(),
        cashFlow(),
        { forecast: forecastResult({ budgetOverflowRisk: [{ category: "Food", projectedSpend: 1200, projectedPercentage: 120 }] }) }
      );
      const rec = result.find((r) => r.key === "forecastBudgetOverflow");
      expect(rec).toMatchObject({ priority: "high", estimatedMonthlySavings: 200, params: { category: "Food", percent: 120 } });
    });

    it("does not fire with no budget overflow risk", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "forecastBudgetOverflow")).toBe(false);
    });
  });

  describe("forecastNegativeCashFlow", () => {
    it("fires when the projected monthly net is negative", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        forecast: forecastResult({ futureCashFlowTrend: { basis: "linearProjection", projectedMonthlyNet: -500 } }),
      });
      const rec = result.find((r) => r.key === "forecastNegativeCashFlow");
      expect(rec).toMatchObject({ priority: "high", estimatedMonthlySavings: 500, params: { deficit: 500 } });
    });

    it("does not fire with insufficient data or a positive projection", () => {
      const insufficient = run(budgets(), behavior(), spending(), healthScore(), cashFlow());
      expect(insufficient.some((r) => r.key === "forecastNegativeCashFlow")).toBe(false);

      const positive = run(budgets(), behavior(), spending(), healthScore(), cashFlow(), {
        forecast: forecastResult({ futureCashFlowTrend: { basis: "linearProjection", projectedMonthlyNet: 500 } }),
      });
      expect(positive.some((r) => r.key === "forecastNegativeCashFlow")).toBe(false);
    });
  });

  describe("forecastSavingsDecline", () => {
    it("fires when expected savings are 20%+ below last month's actual saving", () => {
      const monthlyTrend = [monthPoint({ saving: 1000 }), monthPoint({ saving: 1000 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }), { forecast: forecastResult({ expectedSavings: 700 }) });
      const rec = result.find((r) => r.key === "forecastSavingsDecline");
      expect(rec).toMatchObject({ priority: "medium", estimatedMonthlySavings: 300, params: { percent: 30 } });
    });

    it("does not fire below the 20% decline threshold", () => {
      const monthlyTrend = [monthPoint({ saving: 1000 }), monthPoint({ saving: 1000 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }), { forecast: forecastResult({ expectedSavings: 900 }) });
      expect(result.some((r) => r.key === "forecastSavingsDecline")).toBe(false);
    });
  });

  describe("savingRateImproving", () => {
    it("fires when this month's saving is positive and up 10%+ vs. last month", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(2000, 1000, { changeVsPreviousMonth: { income: null, expense: null, saving: 15 } }));
      const rec = result.find((r) => r.key === "savingRateImproving");
      expect(rec).toMatchObject({ priority: "information", params: { percent: 15 } });
    });

    it("does not fire when this month's saving isn't actually positive", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(1000, 2000, { changeVsPreviousMonth: { income: null, expense: null, saving: 15 } }));
      expect(result.some((r) => r.key === "savingRateImproving")).toBe(false);
    });
  });

  describe("budgetRespected", () => {
    it("does not fire with no budgets set", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "budgetRespected")).toBe(false);
    });

    it("fires when every budget is comfortably within its cap", () => {
      const result = run(budgets([budgetEntry({ status: "ok" })]), behavior(), spending(), healthScore(), cashFlow());
      const rec = result.find((r) => r.key === "budgetRespected");
      expect(rec).toMatchObject({ params: { count: 1 } });
    });

    it("does not fire when any budget is near or over", () => {
      const result = run(budgets([budgetEntry({ status: "near" })]), behavior(), spending(), healthScore(), cashFlow());
      expect(result.some((r) => r.key === "budgetRespected")).toBe(false);
    });
  });

  describe("expensesDecreasing", () => {
    it("fires when expense is down 10%+ vs. last month", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { changeVsPreviousMonth: { income: null, expense: -15, saving: null } }));
      const rec = result.find((r) => r.key === "expensesDecreasing");
      expect(rec).toMatchObject({ params: { percent: 15 } });
    });

    it("does not fire when expense is flat or up", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { changeVsPreviousMonth: { income: null, expense: 5, saving: null } }));
      expect(result.some((r) => r.key === "expensesDecreasing")).toBe(false);
    });
  });

  describe("incomeIncreasing", () => {
    it("fires when income is up 10%+ vs. last month", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { changeVsPreviousMonth: { income: 20, expense: null, saving: null } }));
      const rec = result.find((r) => r.key === "incomeIncreasing");
      expect(rec).toMatchObject({ params: { percent: 20 } });
    });

    it("does not fire below the 10% threshold", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { changeVsPreviousMonth: { income: 5, expense: null, saving: null } }));
      expect(result.some((r) => r.key === "incomeIncreasing")).toBe(false);
    });
  });

  describe("consistentSaving", () => {
    it("fires with 3+ consecutive positive-saving trailing months", () => {
      const monthlyTrend = [monthPoint({ saving: 100 }), monthPoint({ saving: 200 }), monthPoint({ saving: 300 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }));
      const rec = result.find((r) => r.key === "consistentSaving");
      expect(rec).toMatchObject({ params: { months: 3 } });
    });

    it("does not fire with only 2 consecutive positive months", () => {
      const monthlyTrend = [monthPoint({ saving: -50 }), monthPoint({ saving: 200 }), monthPoint({ saving: 300 })];
      const result = run(budgets(), behavior(), spending(), healthScore(), cashFlow(0, 0, { monthlyTrend }));
      expect(result.some((r) => r.key === "consistentSaving")).toBe(false);
    });
  });

  describe("excellentBudgetDiscipline", () => {
    it("fires when the overall health grade is excellent", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(null, "excellent"), cashFlow());
      expect(result.some((r) => r.key === "excellentBudgetDiscipline")).toBe(true);
    });

    it("does not fire for any other grade", () => {
      const result = run(budgets(), behavior(), spending(), healthScore(null, "good"), cashFlow());
      expect(result.some((r) => r.key === "excellentBudgetDiscipline")).toBe(false);
    });
  });

  describe("confidence", () => {
    it("is always high for reduceOverBudgetCategory, a measured fact rather than an estimate", () => {
      const result = run(budgets([budgetEntry({ status: "over", potentialMonthlySavings: 900 })]), behavior(), spending(), healthScore(), cashFlow());
      expect(result[0].confidence).toBe("high");
    });

    it("scales with transaction count for sample-backed rules", () => {
      const low = run(budgets(), behavior([flag({ key: "convenienceStore", totalAmount: 100, transactionCount: 2 })]), spending(), healthScore(), cashFlow());
      expect(low[0].confidence).toBe("low");

      const medium = run(budgets(), behavior([flag({ key: "convenienceStore", totalAmount: 100, transactionCount: 5 })]), spending(), healthScore(), cashFlow());
      expect(medium[0].confidence).toBe("medium");

      const high = run(budgets(), behavior([flag({ key: "convenienceStore", totalAmount: 100, transactionCount: 10 })]), spending(), healthScore(), cashFlow());
      expect(high[0].confidence).toBe("high");
    });

    it("is flat medium for reduceCategoryOverspend and increaseSavingRate, which have no sample-size proxy", () => {
      const categoryOverspend = run(budgets(), behavior(), spending([{ category: "Food", amount: 4000, percentOfTotal: 60 }]), healthScore(), cashFlow());
      expect(categoryOverspend[0].confidence).toBe("medium");

      const savingRate = run(budgets(), behavior(), spending(), healthScore(15), cashFlow(10000));
      expect(savingRate[0].confidence).toBe("medium");
    });
  });

  describe("estimatedImpact", () => {
    it("is null when there's no expense this month to measure a share against", () => {
      const result = run(budgets([budgetEntry({ status: "over", potentialMonthlySavings: 900 })]), behavior(), spending(), healthScore(), cashFlow(0, 0));
      expect(result[0].estimatedImpact).toBeNull();
    });

    it("is the percentage of this month's expense the savings represent", () => {
      // income (10000) kept comfortably above expense so negativeCashFlow
      // doesn't also fire and outrank this recommendation by savings size.
      const result = run(budgets([budgetEntry({ status: "over", potentialMonthlySavings: 900 })]), behavior(), spending(), healthScore(), cashFlow(10000, 4500));
      expect(result[0].estimatedImpact).toBe(20); // 900 / 4500 = 20%
    });
  });

  it("sorts recommendations by estimated savings descending", () => {
    const result = run(
      budgets([budgetEntry({ status: "over", potentialMonthlySavings: 200 })]),
      behavior([flag({ key: "convenienceStore", totalAmount: 4000 })]),
      spending(),
      healthScore(),
      cashFlow()
    );
    expect(result[0].params.behavior).toBe("convenienceStore"); // 1200 > 200
    expect(result[1].params.category).toBe("Food");
  });
});
