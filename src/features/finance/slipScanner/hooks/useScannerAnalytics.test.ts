import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { ScannerRunStats } from "@/features/finance/slipScanner/analytics/scannerAnalytics";
import { useScannerAnalyticsStore } from "@/features/finance/slipScanner/store/scannerAnalyticsStore";

import { useScannerAnalytics } from "./useScannerAnalytics";

const run: ScannerRunStats = {
  imagesScanned: 100,
  qrDetected: 50,
  ocrUsed: 25,
  cacheHits: 10,
  duplicates: 5,
  importSuccess: 40,
  importFailed: 10,
  scanMs: 50_000,
};

beforeEach(() => {
  useScannerAnalyticsStore.getState().reset();
});

describe("useScannerAnalytics", () => {
  it("exposes derived analytics that update after recording a run", () => {
    const { result } = renderHook(() => useScannerAnalytics());
    expect(result.current.analytics.totals.runs).toBe(0);

    act(() => result.current.recordRun(run));

    expect(result.current.analytics.qrDetectionRate).toBeCloseTo(0.5);
    expect(result.current.analytics.importSuccessRate).toBeCloseTo(0.8);
    expect(result.current.analytics.averageScanSpeedPerSec).toBeCloseTo(2);
  });
});
