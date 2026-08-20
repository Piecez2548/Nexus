import { describe, expect, it } from "vitest";
import { buildAiAnalyticsReportPdf, type AiAnalyticsReportData } from "./aiAnalyticsReportPdf";
import type { ExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { FinancialHealthScoreResult } from "@/features/finance/aiAnalytics/engine/scoring/types";

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key} ${JSON.stringify(params)}` : key;

// This builder only exercises headline/highlights/actionPlan (the fields
// buildAiAnalyticsReportPdf actually reads) -- the rest of the report is
// large, deeply-nested, and irrelevant to this function, so it's filled
// with minimal placeholders via a type assertion rather than fully typed.
function makeSummary(overrides: Partial<ExecutiveSummaryReport> = {}): ExecutiveSummaryReport {
  return {
    headline: { key: "stableFinancialPosition", message: { key: "executiveSummary.headline.stable", params: {} } },
    overallSummary: { overallScore: 70, grade: "B", status: "good", insufficientData: false, topStrengths: [], topWeaknesses: [] },
    highlights: { entries: [] },
    behaviorSummary: { spendingStyle: "balanced", insights: [], topPositiveHabits: [], topNegativeHabits: [], confidence: 50 },
    forecastSummary: {
      expectedEndOfMonthBalance: null,
      expectedSavings: 0,
      categoriesLikelyToExceed: [],
      categoriesLikelyToRemainUnder: [],
      goalsAtRisk: [],
      cashFlowStabilityScore: null,
      confidence: 50,
    },
    riskSummary: { entries: [] },
    topRecommendations: [],
    actionPlan: { immediate: [], weekly: [], monthly: [], longTerm: [] },
    confidence: 50,
    ...overrides,
  } as unknown as ExecutiveSummaryReport;
}

function makeHealthScore(overrides: Partial<FinancialHealthScoreResult> = {}): FinancialHealthScoreResult {
  return {
    overallScore: 70,
    grade: "B",
    status: "good",
    insufficientData: false,
    categoryScores: [],
    strengths: [],
    weaknesses: [],
    warnings: [],
    recommendations: [],
    improvementOpportunities: [],
    ...overrides,
  };
}

describe("buildAiAnalyticsReportPdf", () => {
  it("builds a PDF document without throwing for a minimal report", async () => {
    const data: AiAnalyticsReportData = { executiveSummaryReport: makeSummary(), financialHealthScore: makeHealthScore() };
    const doc = await buildAiAnalyticsReportPdf(data, t);
    expect(doc.output("datauristring")).toContain("data:application/pdf");
  });

  it("shows an insufficient-data message when overallScore is null", async () => {
    const data: AiAnalyticsReportData = {
      executiveSummaryReport: makeSummary(),
      financialHealthScore: makeHealthScore({ overallScore: null, grade: null, status: null, insufficientData: true }),
    };
    const doc = await buildAiAnalyticsReportPdf(data, t);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("renders highlights, strengths, and action plan entries without throwing", async () => {
    const data: AiAnalyticsReportData = {
      executiveSummaryReport: makeSummary({
        highlights: {
          entries: [{ type: "savingAchievement", message: { key: "highlight.saving", params: { amount: 500 } }, supportingMetrics: {} }],
        },
        actionPlan: {
          immediate: [{ key: "action.cutSpending", params: {} }],
          weekly: [],
          monthly: [],
          longTerm: [],
        },
      } as unknown as Partial<ExecutiveSummaryReport>),
      financialHealthScore: makeHealthScore({ strengths: [{ key: "strength.savingRate", params: {} }] }),
    };

    const doc = await buildAiAnalyticsReportPdf(data, t);
    expect(doc.output("datauristring")).toContain("data:application/pdf");
  });

  it("spans multiple pages when there is enough content to overflow one", async () => {
    const manyMessages = Array.from({ length: 40 }, (_, i) => ({ key: `strength.${i}`, params: {} }));
    const data: AiAnalyticsReportData = {
      executiveSummaryReport: makeSummary(),
      financialHealthScore: makeHealthScore({ strengths: manyMessages, weaknesses: manyMessages, recommendations: manyMessages }),
    };

    const doc = await buildAiAnalyticsReportPdf(data, t);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});
