import { describe, expect, it, vi } from "vitest";

import { createBackgroundWorker, type TaskOutcome } from "./backgroundWorker";

const task = (id: string, run: () => Promise<unknown>) => ({ id, run });

describe("createBackgroundWorker", () => {
  it("processes all enqueued tasks and reports success", async () => {
    const outcomes: TaskOutcome[] = [];
    const worker = createBackgroundWorker({ onSettled: (o) => outcomes.push(o) });

    for (let i = 0; i < 5; i++) worker.enqueue(task(`t${i}`, async () => i));
    await worker.whenDrained();

    expect(outcomes).toHaveLength(5);
    expect(outcomes.every((o) => o.ok && o.attempts === 1)).toBe(true);
    expect(worker.status).toBe("drained");
  });

  it("retries a failing task up to maxRetries then gives up", async () => {
    const outcomes: TaskOutcome[] = [];
    const worker = createBackgroundWorker({ maxRetries: 2, retryDelayMs: 1, onSettled: (o) => outcomes.push(o) });

    worker.enqueue(task("boom", async () => {
      throw new Error("nope");
    }));
    await worker.whenDrained();

    expect(outcomes[0]).toMatchObject({ id: "boom", ok: false, attempts: 3 }); // 1 + 2 retries
    expect(outcomes[0]!.error).toContain("nope");
  });

  it("never exceeds the configured concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const worker = createBackgroundWorker({ concurrency: 3 });
    for (let i = 0; i < 12; i++) {
      worker.enqueue(task(`t${i}`, async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 0));
        inFlight -= 1;
      }));
    }
    await worker.whenDrained();
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it("cancel clears pending work and marks cancelled", async () => {
    const worker = createBackgroundWorker({ concurrency: 1 });
    for (let i = 0; i < 10; i++) worker.enqueue(task(`t${i}`, async () => new Promise((r) => setTimeout(r, 5))));
    worker.cancel();
    expect(worker.status).toBe("cancelled");
    expect(worker.pending).toBe(0);
  });

  it("pauses and resumes around a controlled task", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const settled = vi.fn();
    const worker = createBackgroundWorker({ concurrency: 1, onSettled: settled });

    worker.enqueue(task("blocker", async () => gate));
    worker.pause();
    expect(worker.status).toBe("paused");

    worker.enqueue(task("after", async () => undefined));
    release(); // let the blocker finish
    worker.resume();
    await worker.whenDrained();

    expect(settled).toHaveBeenCalledTimes(2);
    expect(worker.status).toBe("drained");
  });
});
