import { describe, expect, it } from "vitest";

import { runConcurrentQueue } from "./runConcurrentQueue";

async function* gen<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    await new Promise((r) => setTimeout(r, 0));
    yield item;
  }
}

const noPause = () => Promise.resolve();

describe("runConcurrentQueue", () => {
  it("processes every item", async () => {
    const seen: number[] = [];
    await runConcurrentQueue<number>({
      source: gen([1, 2, 3, 4, 5]),
      handler: async (n) => {
        seen.push(n);
      },
      concurrency: 2,
      maxRetries: 0,
      retryDelayMs: 1,
      waitWhilePaused: noPause,
      isCancelled: () => false,
      onSettled: () => {},
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    await runConcurrentQueue<number>({
      source: gen([1, 2, 3, 4, 5, 6]),
      handler: async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
      },
      concurrency: 2,
      maxRetries: 0,
      retryDelayMs: 1,
      waitWhilePaused: noPause,
      isCancelled: () => false,
      onSettled: () => {},
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("retries a failing job, then reports success", async () => {
    let attempts = 0;
    let settled: { ok: boolean; attempts: number } | null = null;
    await runConcurrentQueue<number>({
      source: gen([1]),
      handler: async () => {
        attempts++;
        if (attempts < 3) throw new Error("transient");
      },
      concurrency: 1,
      maxRetries: 3,
      retryDelayMs: 1,
      waitWhilePaused: noPause,
      isCancelled: () => false,
      onSettled: (r) => {
        settled = { ok: r.ok, attempts: r.attempts };
      },
    });
    expect(attempts).toBe(3);
    expect(settled).toEqual({ ok: true, attempts: 3 });
  });

  it("gives up after maxRetries and reports failure", async () => {
    let settled: { ok: boolean } | null = null;
    await runConcurrentQueue<number>({
      source: gen([1]),
      handler: async () => {
        throw new Error("permanent");
      },
      concurrency: 1,
      maxRetries: 2,
      retryDelayMs: 1,
      waitWhilePaused: noPause,
      isCancelled: () => false,
      onSettled: (r) => {
        settled = { ok: r.ok };
      },
    });
    expect(settled).toEqual({ ok: false });
  });

  it("stops pulling once cancelled", async () => {
    let processed = 0;
    let cancelled = false;
    await runConcurrentQueue<number>({
      source: gen([1, 2, 3, 4, 5, 6, 7, 8]),
      handler: async () => {
        processed++;
        cancelled = true;
        await new Promise((r) => setTimeout(r, 1));
      },
      concurrency: 1,
      maxRetries: 0,
      retryDelayMs: 1,
      waitWhilePaused: noPause,
      isCancelled: () => cancelled,
      onSettled: () => {},
    });
    expect(processed).toBeLessThan(8);
  });
});
