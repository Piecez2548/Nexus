import { beforeEach, describe, expect, it } from "vitest";

import type { ScannerRunStats } from "@/features/finance/slipScanner/analytics/scannerAnalytics";

import { useScannerAnalyticsStore } from "./scannerAnalyticsStore";

const run: ScannerRunStats = {
  imagesScanned: 10,
  qrDetected: 6,
  ocrUsed: 3,
  cacheHits: 2,
  duplicates: 1,
  importSuccess: 4,
  importFailed: 0,
  scanMs: 5000,
};

beforeEach(() => {
  useScannerAnalyticsStore.getState().reset();
});

describe("useScannerAnalyticsStore", () => {
  it("starts empty", () => {
    expect(useScannerAnalyticsStore.getState().totals.runs).toBe(0);
  });

  it("accumulates recorded runs", () => {
    useScannerAnalyticsStore.getState().recordRun(run);
    useScannerAnalyticsStore.getState().recordRun(run);
    const totals = useScannerAnalyticsStore.getState().totals;
    expect(totals.runs).toBe(2);
    expect(totals.imagesScanned).toBe(20);
    expect(totals.importSuccess).toBe(8);
  });

  it("reset clears the totals", () => {
    useScannerAnalyticsStore.getState().recordRun(run);
    useScannerAnalyticsStore.getState().reset();
    expect(useScannerAnalyticsStore.getState().totals.runs).toBe(0);
  });
});
