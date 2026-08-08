import { describe, expect, it } from "vitest";

import { createLocalTelemetry } from "./localTelemetry";

describe("createLocalTelemetry", () => {
  it("aggregates timings by name", () => {
    const t = createLocalTelemetry();
    t.recordTiming("scan", 100);
    t.recordTiming("scan", 300);
    const snap = t.snapshot();
    expect(snap.timings.scan).toEqual({ count: 2, totalMs: 400, avgMs: 200 });
  });

  it("times an async op with the injected clock", async () => {
    let now = 0;
    const t = createLocalTelemetry(() => now);
    await t.time("op", async () => {
      now = 50;
    });
    expect(t.snapshot().timings.op!.avgMs).toBe(50);
  });

  it("counts errors and keeps bounded samples", () => {
    const t = createLocalTelemetry();
    for (let i = 0; i < 25; i++) t.recordError(`err${i}`);
    const snap = t.snapshot();
    expect(snap.errors).toBe(25);
    expect(snap.errorSamples).toHaveLength(20); // bounded
    expect(snap.errorSamples.at(-1)).toBe("err24");
  });

  it("records startup time and null memory off-Chromium", () => {
    const t = createLocalTelemetry();
    t.recordStartup(1234);
    t.sampleMemory();
    const snap = t.snapshot();
    expect(snap.startupMs).toBe(1234);
    expect(snap.memory.usedMB).toBeNull();
  });

  it("reset clears everything", () => {
    const t = createLocalTelemetry();
    t.recordTiming("x", 10);
    t.recordError("e");
    t.reset();
    const snap = t.snapshot();
    expect(snap.errors).toBe(0);
    expect(snap.timings).toEqual({});
  });
});
