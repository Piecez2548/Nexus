import { describe, expect, it, beforeEach, vi } from "vitest";

import { db } from "@/database/db";
import { createScanSession, type ScanSession } from "@/features/finance/slipScanner/services/scanSessionService";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

interface FakeAsset {
  assetId: string;
  capturedAt: string;
  bytes: Uint8Array;
}

class FakeProvider implements MediaProvider {
  readonly id = "fake";
  readonly capabilities = { canEnumerate: true, needsPermission: false };

  private readonly assets: FakeAsset[];

  constructor(assets: FakeAsset[]) {
    this.assets = assets;
  }

  async count(): Promise<number | null> {
    return this.assets.length;
  }

  async *enumerate(sinceCursor?: string): AsyncGenerator<GalleryAssetRef> {
    for (const a of this.assets) {
      if (sinceCursor && a.capturedAt <= sinceCursor) continue;
      // A small gap so pause/cancel can interleave between images.
      await new Promise((r) => setTimeout(r, 1));
      yield { assetId: a.assetId, capturedAt: a.capturedAt, bytes: a.bytes.length };
    }
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    const a = this.assets.find((x) => x.assetId === asset.assetId);
    if (!a) throw new Error(`no fake asset ${asset.assetId}`);
    return a.bytes;
  }
}

function asset(id: string, month: number, bytes: number[]): FakeAsset {
  return { assetId: id, capturedAt: `2026-0${month}-01T00:00:00.000Z`, bytes: new Uint8Array(bytes) };
}

async function until(pred: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("until: timed out");
    await new Promise((r) => setTimeout(r, 2));
  }
}

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipScanCache.clear();
});

describe("createScanSession", () => {
  it("scans every image and persists a completed run", async () => {
    const provider = new FakeProvider([asset("a", 1, [1]), asset("b", 2, [2]), asset("c", 3, [3])]);
    const run = await createScanSession({ provider, options: { source: "fake", incremental: false } }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(3);
    expect(run.skipped).toBe(0);
    expect(await db.slipScanCache.count()).toBe(3);
  });

  it("re-scans an asset whose last-modified changed", async () => {
    const original = asset("edit", 1, [1]);
    await createScanSession({ provider: new FakeProvider([original]), options: { source: "fake", incremental: true } }).done;

    const edited: FakeAsset = { assetId: "edit", capturedAt: "2026-06-01T00:00:00.000Z", bytes: new Uint8Array([2]) };
    const run = await createScanSession({ provider: new FakeProvider([edited]), options: { source: "fake", incremental: true } }).done;

    expect(run.done).toBe(1); // changed → re-scanned, not skipped
    expect(run.skipped).toBe(0);
  });

  it("re-scans when the engine version bumps, despite identical content (stale cache)", async () => {
    const a = asset("v", 1, [7]);
    await createScanSession({
      provider: new FakeProvider([a]),
      options: { source: "fake", incremental: true },
      engineVersions: { ocr: "1", payload: "1", parser: "1" },
    }).done;

    const run = await createScanSession({
      provider: new FakeProvider([a]),
      options: { source: "fake", incremental: true },
      engineVersions: { ocr: "1", payload: "1", parser: "2" },
    }).done;

    expect(run.done).toBe(1); // stale entry re-scanned even though the image is unchanged
  });

  it("prevents duplicates — identical content is scanned once", async () => {
    const provider = new FakeProvider([asset("a", 1, [9, 9]), asset("b", 2, [9, 9])]);
    const run = await createScanSession({ provider, options: { source: "fake", incremental: false } }).done;

    expect(run.done).toBe(1);
    expect(run.skipped).toBe(1);
  });

  it("retries a failing item instead of treating its retry as a duplicate of itself", async () => {
    let attempts = 0;
    const provider = new FakeProvider([asset("fails", 1, [5])]);
    const processor: ScanProcessor = {
      async process() {
        attempts++;
        throw new Error("boom");
      },
    };

    const run = await createScanSession({
      provider,
      options: { source: "fake", incremental: false, maxRetries: 1, retryDelayMs: 0 },
      processor,
    }).done;

    // 1 initial attempt + 1 retry — not silently skipped as a "duplicate" of
    // its own first (failed) attempt's content hash.
    expect(attempts).toBe(2);
    expect(run.failed).toBe(1);
    expect(run.skipped).toBe(0);
    expect(run.done).toBe(0);
  });

  it("coalesces progress checkpoint writes instead of persisting on every single item", async () => {
    const items = Array.from({ length: 20 }, (_, i) => asset(`t${i}`, (i % 9) + 1, [i, i + 50]));
    const updateSpy = vi.spyOn(db.slipScanRuns, "update");

    const run = await createScanSession({
      provider: new FakeProvider(items),
      options: { source: "fake", incremental: false, concurrency: 4, checkpointIntervalMs: 1_000_000, checkpointEveryN: 5 },
    }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(20); // final persisted state is exact...
    // ...even though far fewer than 20 checkpoint writes happened along the way
    // (1 create-time "running" checkpoint doesn't count here; every write below
    // is from the throttled progress-persistence path, plus the unconditional
    // final flush and the cursor checkpoint).
    expect(updateSpy.mock.calls.length).toBeLessThan(20);

    updateSpy.mockRestore();
  });

  it("incremental — a second scan skips already-scanned assets", async () => {
    const assets = [asset("a", 1, [1]), asset("b", 2, [2])];
    await createScanSession({ provider: new FakeProvider(assets), options: { source: "fake", incremental: true } }).done;

    const run2 = await createScanSession({ provider: new FakeProvider(assets), options: { source: "fake", incremental: true } }).done;
    expect(run2.done).toBe(0);
    expect(run2.skipped).toBe(2);
  });

  it("cancel stops the scan and marks the run cancelled", async () => {
    // More assets than the concurrency so cancel clearly leaves work undone.
    const items = Array.from({ length: 10 }, (_, i) => asset(`c${i}`, (i % 9) + 1, [i, i + 1]));
    let session: ScanSession;
    session = createScanSession({
      provider: new FakeProvider(items),
      options: { source: "fake", incremental: false, concurrency: 2 },
      onProgress: (p) => {
        if (p.done >= 1) session.control.cancel();
      },
    });

    const run = await session.done;
    expect(run.status).toBe("cancelled");
    expect(run.done).toBeLessThan(10);
  });

  it("pause halts progress and resume runs it to completion", async () => {
    const items = Array.from({ length: 8 }, (_, i) => asset(`p${i}`, (i % 9) + 1, [i, 100 + i]));
    let lastDone = 0;
    let pausedOnce = false;
    let session: ScanSession;
    session = createScanSession({
      provider: new FakeProvider(items),
      options: { source: "fake", incremental: false, concurrency: 2 },
      onProgress: (p, s) => {
        lastDone = p.done;
        if (!pausedOnce && p.done >= 1 && s === "running") {
          pausedOnce = true;
          session.control.pause();
        }
      },
    });

    await until(() => session.control.status === "paused");
    const doneAtPause = lastDone;

    session.control.resume();
    const run = await session.done;
    expect(run.status).toBe("completed");
    expect(run.done).toBe(8);
    expect(doneAtPause).toBeLessThan(8);
  });
});
