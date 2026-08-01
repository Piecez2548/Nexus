import { describe, expect, it } from "vitest";
import { buildRiskSummary } from "./riskSummaryBuilder";
import type { ForecastAlert } from "@/features/finance/aiAnalytics/engine/forecast/types";

function alert(overrides: Partial<ForecastAlert>): ForecastAlert {
  return { id: "a1", type: "budgetOverflow", severity: "warning", message: { key: "m", params: {} }, relatedForecastKey: "x", sourceRecommendationId: null, ...overrides };
}

describe("buildRiskSummary", () => {
  it("maps budgetOverflow/savingsDecline/cashShortage/goalDelay 1:1 to their RiskCategory namesake", () => {
    const alerts = [alert({ id: "1", type: "budgetOverflow" }), alert({ id: "2", type: "savingsDecline" }), alert({ id: "3", type: "cashShortage" }), alert({ id: "4", type: "goalDelay" })];
    const result = buildRiskSummary(alerts);
    expect(result.entries.map((e) => e.category).sort()).toEqual(["budgetOverflow", "cashShortage", "goalDelay", "savingsDecline"]);
  });

  it("splits unusualSpendingGrowth into highSpendingCategories for category-trend rule keys", () => {
    const alerts = [alert({ type: "unusualSpendingGrowth", relatedForecastKey: "foodIncreasingTrend" }), alert({ type: "unusualSpendingGrowth", relatedForecastKey: "shoppingGrowthHigh" })];
    const result = buildRiskSummary(alerts);
    expect(result.entries.every((e) => e.category === "highSpendingCategories")).toBe(true);
  });

  it("splits unusualSpendingGrowth into unusualSpendingBehavior for merchant/transaction-level rule keys", () => {
    const alerts = [alert({ type: "unusualSpendingGrowth", relatedForecastKey: "fastestGrowingMerchant" }), alert({ type: "unusualSpendingGrowth", relatedForecastKey: "expenseSpike" })];
    const result = buildRiskSummary(alerts);
    expect(result.entries.every((e) => e.category === "unusualSpendingBehavior")).toBe(true);
  });

  it("sorts entries with critical severity first", () => {
    const alerts = [alert({ id: "info", severity: "info" }), alert({ id: "critical", severity: "critical" }), alert({ id: "warning", severity: "warning" })];
    const result = buildRiskSummary(alerts);
    expect(result.entries.map((e) => e.sourceAlertId)).toEqual(["critical", "warning", "info"]);
  });

  it("reuses the alert's own message verbatim", () => {
    const message = { key: "specific.key", params: { amount: 500 } };
    const result = buildRiskSummary([alert({ message })]);
    expect(result.entries[0].message).toBe(message);
  });

  it("is empty when there are no alerts", () => {
    expect(buildRiskSummary([]).entries).toEqual([]);
  });
});
