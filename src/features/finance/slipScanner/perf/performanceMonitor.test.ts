import { describe, expect, it } from "vitest";

import { createPerformanceMonitor } from "./performanceMonitor";

describe("createPerformanceMonitor", () => {
  it("times an async stage using the injected clock", async () => {
    let t = 0;
    const monitor = createPerformanceMonitor(() => t);

    await monitor.time("ocr", async () => {
      t = 200; // stage took 200ms
    });
    await monitor.time("ocr", async () => {
      t = 300; // +100ms
    });

    const ocr = monitor.snapshot().ocr;
    expect(ocr.count).toBe(2);
    expect(ocr.avgMs).toBe(150); // (200 + 100) / 2
    expect(ocr.perSec).toBeCloseTo(2000 / 300); // 2 ops / 0.3s
  });

  it("records stage durations directly and computes per-stage stats", () => {
    const monitor = createPerformanceMonitor();
    monitor.record("qr", 50);
    monitor.record("qr", 150);
    const qr = monitor.snapshot().qr;
    expect(qr.count).toBe(2);
    expect(qr.avgMs).toBe(100);
  });

  it("tracks cache-hit ratio and null memory off-Chromium", () => {
    const monitor = createPerformanceMonitor();
    monitor.setCacheHitRatio(0.42);
    monitor.sampleMemory();
    const snap = monitor.snapshot();
    expect(snap.cacheHitRatio).toBe(0.42);
    expect(snap.memory.usedMB).toBeNull(); // jsdom has no performance.memory
  });

  it("reset clears all stats", () => {
    const monitor = createPerformanceMonitor();
    monitor.record("scan", 100);
    monitor.setCacheHitRatio(0.9);
    monitor.reset();
    const snap = monitor.snapshot();
    expect(snap.scan.count).toBe(0);
    expect(snap.cacheHitRatio).toBe(0);
  });
});
