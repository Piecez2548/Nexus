import { describe, expect, it } from "vitest";
import { estimateBudgetForecast } from "./budgetForecastEstimator";
import type { BudgetProgress } from "@/features/finance/utils/budgetStatus";

const now = new Date(2026, 6, 15); // day 15 of a 31-day month

function progress(overrides: Partial<BudgetProgress["budget"]> & { spent: number; status?: "ok" | "near" | "over" }): BudgetProgress {
  const budget = { id: 1, category: "Food", amount: 1000, period: "monthly" as const, ...overrides };
  const percentage = Math.min((overrides.spent / budget.amount) * 100, 100);
  return { budget, spent: overrides.spent, remaining: Math.max(0, budget.amount - overrides.spent), percentage, status: overrides.status ?? "ok" };
}

describe("estimateBudgetForecast", () => {
  it("classifies a budget on pace to bust as likelyExceed", () => {
    // 600 spent by day 15/31 -> projected (600/15)*31 = 1240, over 1000.
    const result = estimateBudgetForecast([progress({ spent: 600 })], 3, false, now);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].classification).toBe("likelyExceed");
    expect(result.categoriesLikelyToExceed).toEqual(["Food"]);
    expect(result.entries[0].estimatedOverflowAmount).toBeGreaterThan(0);
  });

  it("classifies a budget on pace to stay under as likelyRemainUnder", () => {
    // 200 spent by day 15/31 -> projected (200/15)*31 ≈ 413, well under 1000.
    const result = estimateBudgetForecast([progress({ spent: 200 })], 3, false, now);
    expect(result.entries[0].classification).toBe("likelyRemainUnder");
    expect(result.categoriesLikelyToRemainUnder).toEqual(["Food"]);
    expect(result.entries[0].estimatedOverflowAmount).toBe(0);
  });

  it("excludes budgets already status===over — a present-tense fact, not a forecast", () => {
    const result = estimateBudgetForecast([progress({ spent: 1200, status: "over" })], 3, false, now);
    expect(result.entries).toHaveLength(0);
  });

  it("excludes budgets with amount<=0", () => {
    const result = estimateBudgetForecast([progress({ spent: 0, amount: 0 })], 3, false, now);
    expect(result.entries).toHaveLength(0);
  });

  it("re-exposes today's actual utilization as completionPercentage", () => {
    const result = estimateBudgetForecast([progress({ spent: 500 })], 3, false, now);
    expect(result.entries[0].completionPercentage).toBe(50);
  });

  it("generalizes to weekly and yearly budget periods, not just monthly", () => {
    const weekly = progress({ spent: 100, period: "weekly", amount: 200 });
    const yearly = progress({ spent: 5000, period: "yearly", amount: 12000 });
    const result = estimateBudgetForecast([weekly, yearly], 3, false, now);
    expect(result.entries.map((e) => e.period).sort()).toEqual(["weekly", "yearly"]);
  });
});
