import { describe, expect, it } from "vitest";
import { calculateImpact } from "@/features/finance/aiAnalytics/engine/recommendation/calculators/impactCalculator";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { BudgetAnalysisResult, BudgetAnalysisEntry } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

function rec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "test",
    key: "reduceOverBudgetCategory",
    priority: "medium",
    estimatedMonthlySavings: 500,
    confidence: "medium",
    estimatedImpact: null,
    params: {},
    title: { key: "title", params: {} },
    reason: { key: "reason", params: {} },
    action: { key: "action", params: {} },
    ...overrides,
  };
}

function overBudgetEntry(category: string, amount: number, spent: number): BudgetAnalysisEntry {
  return {
    budget: { category, amount, period: "monthly" },
    spent,
    remaining: amount - spent,
    percentage: 100,
    status: "over",
    suggestedMonthlyCap: amount,
    potentialMonthlySavings: spent - amount,
  };
}

function budgets(entries: BudgetAnalysisEntry[] = []): BudgetAnalysisResult {
  return { entries, overCount: entries.length, nearCount: 0, okCount: 0 };
}

function cashFlow(income: number): CashFlowAnalysisResult {
  return { income, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0, changeVsPreviousMonth: { income: null, expense: null, saving: null }, monthlyTrend: [] };
}

describe("calculateImpact", () => {
  it("always reports monthly and annual savings", () => {
    const result = calculateImpact(rec({ estimatedMonthlySavings: 500 }), budgets(), cashFlow(0));
    expect(result.monthlySavings).toBe(500);
    expect(result.annualSavings).toBe(6000);
  });

  it("is null for budgetImprovementPercent with no matching over-budget category", () => {
    const result = calculateImpact(rec({ params: { category: "Food" } }), budgets(), cashFlow(0));
    expect(result.budgetImprovementPercent).toBeNull();
  });

  it("computes the share of the overage this recommendation's savings would eliminate", () => {
    // Food budget 5000, spent 6000 -> overage 1000. Savings 500 -> 50%.
    const result = calculateImpact(rec({ params: { category: "Food" }, estimatedMonthlySavings: 500 }), budgets([overBudgetEntry("Food", 5000, 6000)]), cashFlow(0));
    expect(result.budgetImprovementPercent).toBe(50);
  });

  it("caps budgetImprovementPercent at 100 when savings exceed the overage", () => {
    const result = calculateImpact(rec({ params: { category: "Food" }, estimatedMonthlySavings: 5000 }), budgets([overBudgetEntry("Food", 5000, 6000)]), cashFlow(0));
    expect(result.budgetImprovementPercent).toBe(100);
  });

  it("is null for savingRateImprovementPercent with no income", () => {
    const result = calculateImpact(rec(), budgets(), cashFlow(0));
    expect(result.savingRateImprovementPercent).toBeNull();
  });

  it("computes savingRateImprovementPercent as a share of income", () => {
    const result = calculateImpact(rec({ estimatedMonthlySavings: 3000 }), budgets(), cashFlow(30000));
    expect(result.savingRateImprovementPercent).toBe(10);
  });
});
