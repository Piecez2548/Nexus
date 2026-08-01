import { describe, expect, it } from "vitest";
import { buildSummary } from "@/features/finance/aiAnalytics/models/summary.model";
import type { Recommendation, RecommendationPriority } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

function rec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "test",
    key: "test",
    priority: "medium",
    estimatedMonthlySavings: 0,
    confidence: "medium",
    estimatedImpact: null,
    params: {},
    title: { key: "title.test", params: {} },
    reason: { key: "reason.test", params: {} },
    action: { key: "action.test", params: {} },
    ...overrides,
  };
}

describe("buildSummary", () => {
  it("is all-empty with no recommendations", () => {
    const summary = buildSummary([]);
    expect(summary).toEqual({ headline: null, positiveHighlights: [], negativeHighlights: [], opportunities: [], risks: [], nextActions: [] });
  });

  it("uses the first (highest-priority) recommendation's title as the headline", () => {
    const top = rec({ id: "top", title: { key: "title.top", params: {} } });
    const summary = buildSummary([top, rec({ id: "second" })]);
    expect(summary.headline).toEqual(top.title);
  });

  it("buckets information-priority recommendations as positive highlights, using their reason", () => {
    const positive = rec({ id: "positive", priority: "information", reason: { key: "reason.positive", params: {} } });
    const summary = buildSummary([positive]);
    expect(summary.positiveHighlights).toEqual([positive.reason]);
    expect(summary.negativeHighlights).toEqual([]);
  });

  it.each<RecommendationPriority>(["critical", "high"])("buckets %s-priority recommendations as negative highlights, using their title", (priority) => {
    const negative = rec({ id: "negative", priority, title: { key: "title.negative", params: {} } });
    const summary = buildSummary([negative]);
    expect(summary.negativeHighlights).toEqual([negative.title]);
  });

  it("does not bucket medium/low priority recommendations as either highlight", () => {
    const summary = buildSummary([rec({ priority: "medium" }), rec({ priority: "low" })]);
    expect(summary.positiveHighlights).toEqual([]);
    expect(summary.negativeHighlights).toEqual([]);
  });

  it("takes the top 3 recommendations with real savings as opportunities, using their action", () => {
    const withSavings = [
      rec({ id: "a", estimatedMonthlySavings: 300, action: { key: "action.a", params: {} } }),
      rec({ id: "b", estimatedMonthlySavings: 200, action: { key: "action.b", params: {} } }),
      rec({ id: "c", estimatedMonthlySavings: 100, action: { key: "action.c", params: {} } }),
      rec({ id: "d", estimatedMonthlySavings: 50, action: { key: "action.d", params: {} } }),
    ];
    const summary = buildSummary([...withSavings, rec({ id: "zero", estimatedMonthlySavings: 0 })]);
    expect(summary.opportunities).toEqual([withSavings[0].action, withSavings[1].action, withSavings[2].action]);
  });

  it("buckets forecast-rule recommendations as risks, using their title", () => {
    const risk = rec({ id: "r", key: "forecastBudgetOverflow", title: { key: "title.risk", params: {} } });
    const notRisk = rec({ id: "n", key: "reduceCategoryOverspend" });
    const summary = buildSummary([risk, notRisk]);
    expect(summary.risks).toEqual([risk.title]);
  });

  it("takes the top 3 recommendations overall as next actions, using their action", () => {
    const list = [rec({ id: "a" }), rec({ id: "b" }), rec({ id: "c" }), rec({ id: "d" })];
    const summary = buildSummary(list);
    expect(summary.nextActions).toEqual([list[0].action, list[1].action, list[2].action]);
  });
});
