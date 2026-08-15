import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createWorker } = vi.hoisted(() => ({ createWorker: vi.fn() }));

vi.mock("tesseract.js", () => ({ createWorker }));

const { getOcrWorkerPool, resetOcrWorkerPoolForTests } = await import("./ocrWorkerPool");

// Deterministic pool size: resolveConcurrency() = min(max(1, cores-1), 4).
// hardwareConcurrency=3 -> maxSize=2, small enough to exercise "wait for a
// free worker" without an unwieldy number of fake workers.
function setHardwareConcurrency(n: number): void {
  Object.defineProperty(navigator, "hardwareConcurrency", { value: n, configurable: true });
}

function fakeWorker(text: string) {
  return {
    recognize: vi.fn(async () => ({ data: { text } })),
    terminate: vi.fn(async () => {}),
  };
}

beforeEach(() => {
  createWorker.mockReset();
  setHardwareConcurrency(3); // -> maxSize 2
});

afterEach(async () => {
  await resetOcrWorkerPoolForTests();
});

describe("OcrWorkerPool (via getOcrWorkerPool)", () => {
  it("reuses one worker across sequential calls instead of creating a new one each time", async () => {
    const worker = fakeWorker("a");
    createWorker.mockResolvedValue(worker);
    const pool = getOcrWorkerPool();

    await pool.recognize(new Uint8Array([1]));
    await pool.recognize(new Uint8Array([2]));
    await pool.recognize(new Uint8Array([3]));

    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.recognize).toHaveBeenCalledTimes(3);
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it("creates workers on demand up to maxSize for concurrent calls, not one per call", async () => {
    let created = 0;
    createWorker.mockImplementation(async () => {
      created += 1;
      return fakeWorker(`w${created}`);
    });
    const pool = getOcrWorkerPool();

    // 5 concurrent recognize() calls, maxSize is 2 -- expect exactly 2
    // workers created, the rest queued/reused as workers free up.
    await Promise.all(Array.from({ length: 5 }, (_, i) => pool.recognize(new Uint8Array([i]))));

    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it("returns the correct text for each call even when interleaved across a small pool", async () => {
    const worker1 = fakeWorker("first");
    const worker2 = fakeWorker("second");
    createWorker.mockResolvedValueOnce(worker1).mockResolvedValueOnce(worker2);
    const pool = getOcrWorkerPool();

    const [a, b, c, d] = await Promise.all([
      pool.recognize(new Uint8Array([1])),
      pool.recognize(new Uint8Array([2])),
      pool.recognize(new Uint8Array([3])),
      pool.recognize(new Uint8Array([4])),
    ]);

    // Only two distinct workers exist, so every result must be one of the two.
    for (const result of [a, b, c, d]) expect(["first", "second"]).toContain(result);
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it("getOcrWorkerPool() returns the same shared instance across calls", () => {
    expect(getOcrWorkerPool()).toBe(getOcrWorkerPool());
  });

  it("resetOcrWorkerPoolForTests terminates idle workers and clears the singleton", async () => {
    const worker = fakeWorker("a");
    createWorker.mockResolvedValue(worker);
    const pool = getOcrWorkerPool();
    await pool.recognize(new Uint8Array([1]));

    await resetOcrWorkerPoolForTests();

    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
