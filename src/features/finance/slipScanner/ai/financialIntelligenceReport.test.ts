import { describe, expect, it } from "vitest";

import {
  buildFinancialIntelligenceReport,
  reportToCsv,
  reportToJson,
  type FinancialReportInput,
} from "./financialIntelligenceReport";

const input: FinancialReportInput = {
  importAccuracy: 95.4,
  ocrAccuracy: 82.1,
  aiConfidence: 88.6,
  fraud: { high: 1, medium: 2, low: 10 },
  duplicates: { detected: 3, total: 20 },
  topMerchants: [
    { name: "Starbucks", count: 5, total: 600 },
    { name: "Grab", count: 3, total: 240 },
  ],
  spendingInsights: ["Your biggest spending category is Food (800)."],
};

const now = () => "2026-08-08T00:00:00.000Z";

describe("buildFinancialIntelligenceReport", () => {
  it("aggregates and rounds the metrics and computes the duplicate rate", () => {
    const report = buildFinancialIntelligenceReport(input, now);
    expect(report.generatedAt).toBe("2026-08-08T00:00:00.000Z");
    expect(report.importAccuracy).toBe(95);
    expect(report.ocrAccuracy).toBe(82);
    expect(report.aiConfidence).toBe(89);
    expect(report.duplicateSummary.rate).toBe(15); // 3/20
    expect(report.fraudSummary).toEqual({ high: 1, medium: 2, low: 10 });
  });

  it("handles zero totals safely", () => {
    const report = buildFinancialIntelligenceReport({ ...input, duplicates: { detected: 0, total: 0 } }, now);
    expect(report.duplicateSummary.rate).toBe(0);
  });
});

describe("report serialisers", () => {
  it("serialises to JSON round-trippably", () => {
    const report = buildFinancialIntelligenceReport(input, now);
    expect(JSON.parse(reportToJson(report)).importAccuracy).toBe(95);
  });

  it("serialises to CSV with metric, merchant and insight sections", () => {
    const csv = reportToCsv(buildFinancialIntelligenceReport(input, now));
    expect(csv).toContain("Import accuracy,95%");
    expect(csv).toContain("Duplicates,3 of 20 (15%)");
    expect(csv).toContain("Starbucks,5,600");
    expect(csv).toContain("Your biggest spending category is Food (800).");
  });
});
