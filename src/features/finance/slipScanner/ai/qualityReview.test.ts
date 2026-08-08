import { describe, expect, it } from "vitest";

import { reviewImportQuality, reviewItem, type ReviewableItem } from "./qualityReview";

const item = (over: Partial<ReviewableItem>): ReviewableItem => ({
  id: "x",
  amount: 100,
  date: "2026-08-01",
  merchant: "Shop",
  category: "Food",
  confidence: 90,
  duplicateProbability: 0.1,
  ...over,
});

describe("reviewItem", () => {
  it("returns null for a clean item", () => {
    expect(reviewItem(item({}))).toBeNull();
  });

  it("flags missing data", () => {
    expect(reviewItem(item({ amount: undefined }))?.issues).toContain("missing-data");
    expect(reviewItem(item({ merchant: "" }))?.issues).toContain("missing-data");
  });

  it("flags uncategorised, low confidence, duplicate risk and OCR suspicion", () => {
    const finding = reviewItem(item({ category: "Others", confidence: 30, duplicateProbability: 0.8, ocrSuspect: true }))!;
    expect(finding.issues.sort()).toEqual(
      ["duplicate-risk", "incorrect-ocr", "low-confidence", "wrong-category"].sort(),
    );
    expect(finding.recommendation.length).toBeGreaterThan(0);
  });
});

describe("reviewImportQuality", () => {
  it("returns findings only for problematic items", () => {
    const findings = reviewImportQuality([
      item({ id: "ok" }),
      item({ id: "bad", amount: undefined, confidence: 20 }),
    ]);
    expect(findings.map((f) => f.id)).toEqual(["bad"]);
    expect(findings[0]!.issues).toContain("missing-data");
    expect(findings[0]!.issues).toContain("low-confidence");
  });
});
