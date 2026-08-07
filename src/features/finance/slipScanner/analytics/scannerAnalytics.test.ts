import { describe, expect, it } from "vitest";

import { deriveAnalytics, emptyTotals, mergeRun, type ScannerRunStats } from "./scannerAnalytics";

const run = (over: Partial<ScannerRunStats> = {}): ScannerRunStats => ({
  imagesScanned: 100,
  qrDetected: 60,
  ocrUsed: 30,
  cacheHits: 20,
  duplicates: 10,
  importSuccess: 40,
  importFailed: 5,
  scanMs: 50_000,
  ...over,
});

describe("mergeRun", () => {
  it("accumulates run stats and increments the run count immutably", () => {
    const totals = emptyTotals();
    const merged = mergeRun(mergeRun(totals, run()), run({ imagesScanned: 50 }));
    expect(merged.runs).toBe(2);
    expect(merged.imagesScanned).toBe(150);
    expect(merged.qrDetected).toBe(120);
    expect(totals.runs).toBe(0); // original untouched
  });
});

describe("deriveAnalytics", () => {
  it("derives rates and scan speed from totals", () => {
    const totals = mergeRun(emptyTotals(), run());
    const analytics = deriveAnalytics(totals);
    expect(analytics.qrDetectionRate).toBeCloseTo(0.6);
    expect(analytics.ocrUsageRate).toBeCloseTo(0.3);
    expect(analytics.cacheHitRate).toBeCloseTo(0.2);
    expect(analytics.duplicateRate).toBeCloseTo(0.1);
    expect(analytics.importSuccessRate).toBeCloseTo(40 / 45);
    // 100 images over 50s => 2 images/sec
    expect(analytics.averageScanSpeedPerSec).toBeCloseTo(2);
    expect(analytics.averageMsPerImage).toBe(500);
  });

  it("is zero-safe with empty totals", () => {
    const analytics = deriveAnalytics(emptyTotals());
    expect(analytics.qrDetectionRate).toBe(0);
    expect(analytics.importSuccessRate).toBe(0);
    expect(analytics.averageScanSpeedPerSec).toBe(0);
  });
});
