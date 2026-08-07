import { describe, expect, it } from "vitest";

import { createScanMetrics } from "./scanMetrics";

describe("createScanMetrics", () => {
  it("computes cache-hit and skip ratios from decisions", () => {
    const metrics = createScanMetrics(0);
    metrics.onDecision("skip-unchanged");
    metrics.onDecision("skip-unchanged");
    metrics.onDecision("skip-failed");
    metrics.onDecision("scan");

    const snap = metrics.snapshot(0);
    expect(snap.total).toBe(4);
    expect(snap.cacheHits).toBe(2);
    expect(snap.skippedFailed).toBe(1);
    expect(snap.toScan).toBe(1);
    expect(snap.cacheHitRatio).toBe(0.5);
    expect(snap.skipRatio).toBe(0.75);
  });

  it("tracks processed bytes, average size and peak in-flight memory", () => {
    const metrics = createScanMetrics(0);
    metrics.observeInFlightBytes(1000);
    metrics.observeInFlightBytes(4000);
    metrics.observeInFlightBytes(2000);
    metrics.onScanned(100);
    metrics.onScanned(300);

    const snap = metrics.snapshot(0);
    expect(snap.scanned).toBe(2);
    expect(snap.bytesProcessed).toBe(400);
    expect(snap.avgBytesPerImage).toBe(200);
    expect(snap.peakInFlightBytes).toBe(4000);
  });

  it("computes throughput from elapsed time", () => {
    const metrics = createScanMetrics(1000);
    metrics.onScanned(10);
    metrics.onScanned(10);
    // 2 images over 2000ms => 1 image/sec
    expect(metrics.snapshot(3000).throughputPerSec).toBe(1);
  });

  it("counts failures and duplicates and stays safe with zero total", () => {
    const metrics = createScanMetrics(0);
    metrics.onFailed();
    metrics.onDuplicate();
    const snap = metrics.snapshot(0);
    expect(snap.failed).toBe(1);
    expect(snap.duplicates).toBe(1);
    expect(snap.cacheHitRatio).toBe(0);
    expect(snap.throughputPerSec).toBe(0);
    expect(snap.avgBytesPerImage).toBe(0);
  });
});
