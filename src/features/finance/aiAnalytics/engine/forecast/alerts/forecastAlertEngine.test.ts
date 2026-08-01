import { describe, expect, it } from "vitest";
import { generateForecastAlerts } from "./forecastAlertEngine";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";
import type { Goal } from "@/features/finance/types";
import type { GoalForecastEntry } from "@/features/finance/aiAnalytics/engine/forecast/types";

function recommendation(overrides: Partial<Recommendation>): Recommendation {
  return {
    id: "rec-1",
    key: "forecastBudgetOverflow",
    priority: "high",
    estimatedMonthlySavings: 0,
    confidence: "medium",
    estimatedImpact: null,
    params: {},
    title: { key: "some.title", params: {} },
    reason: { key: "some.reason", params: {} },
    action: { key: "some.action", params: {} },
    ...overrides,
  };
}

function goalForecastEntry(overrides: Partial<GoalForecastEntry> & { goal: Goal }): GoalForecastEntry {
  return { paceKnown: false, monthlyProgressAmount: null, expectedCompletionDate: null, requiredMonthlyContribution: null, probabilityOfCompletion: null, projectedDelayDays: null, ...overrides };
}

describe("generateForecastAlerts", () => {
  it("converts an allowlisted rule recommendation into a forecast alert, preserving traceability", () => {
    const recommendations = [recommendation({ id: "rec-1", key: "forecastBudgetOverflow", priority: "high" })];
    const alerts = generateForecastAlerts(recommendations, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("budgetOverflow");
    expect(alerts[0].severity).toBe("warning");
    expect(alerts[0].sourceRecommendationId).toBe("rec-1");
  });

  it("maps critical priority to critical severity", () => {
    const recommendations = [recommendation({ key: "repeatedNegativeCashFlow", priority: "critical" })];
    const alerts = generateForecastAlerts(recommendations, []);
    expect(alerts[0].severity).toBe("critical");
    expect(alerts[0].type).toBe("cashShortage");
  });

  it("ignores recommendations whose rule key isn't on the allowlist", () => {
    const recommendations = [recommendation({ key: "someUnrelatedRule" })];
    const alerts = generateForecastAlerts(recommendations, []);
    expect(alerts).toHaveLength(0);
  });

  it("generates a goalDelay alert from a positive projectedDelayDays, distinct from the rule-based alerts", () => {
    const goalForecast = [goalForecastEntry({ goal: { name: "Vacation", targetAmount: 10000, currentAmount: 5000 }, projectedDelayDays: 45 })];
    const alerts = generateForecastAlerts([], goalForecast);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("goalDelay");
    expect(alerts[0].sourceRecommendationId).toBeNull();
    expect(alerts[0].message.params.days).toBe(45);
  });

  it("does not generate a goalDelay alert when projectedDelayDays is null or non-positive", () => {
    const goalForecast = [
      goalForecastEntry({ goal: { name: "A", targetAmount: 1000, currentAmount: 0 }, projectedDelayDays: null }),
      goalForecastEntry({ goal: { name: "B", targetAmount: 1000, currentAmount: 0 }, projectedDelayDays: -5 }),
    ];
    const alerts = generateForecastAlerts([], goalForecast);
    expect(alerts).toHaveLength(0);
  });
});
