import { describe, expect, it } from "vitest";
import { categoryForInsight } from "@/features/finance/aiAnalytics/models/insight.model";
import type { AiInsight, AiInsightKey } from "@/features/finance/aiAnalytics/engine/analyzers/insights";

function insight(key: AiInsightKey): AiInsight {
  return { id: "test", key, severity: "info", params: {} };
}

describe("categoryForInsight", () => {
  it.each<[AiInsightKey, string]>([
    ["highestSpendingCategory", "spending"],
    ["budgetExceeded", "budget"],
    ["cashFlowSummary", "cashFlow"],
    ["weekendOverspending", "behavior"],
    ["upcomingBudgetRisk", "forecast"],
  ])("maps %s to %s", (key, expected) => {
    expect(categoryForInsight(insight(key))).toBe(expected);
  });
});
