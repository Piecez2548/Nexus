import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/database/db";
import type { ScanCache } from "@/features/finance/slipScanner/cache/scanCache";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";
import { createScanSession } from "@/features/finance/slipScanner/services/scanSessionService";

// Stress + memory test (GS-021): drive the real orchestration with a large,
// lazily-enumerated library and assert (a) everything is processed and (b)
// parallelism — and therefore in-flight memory — stays bounded by the
// configured concurrency, never fanning out to one task per image. An
// in-memory cache keeps it fast and Dexie-free; a real run at 50k relies on the
// same lazy-enumeration + bounded-queue mechanism proven here at a smaller N.

class StressProvider implements MediaProvider {
  readonly id = "stress";
  readonly capabilities = { canEnumerate: true, needsPermission: false };

  private readonly n: number;
  private readonly declaredBytes: number;

  constructor(n: number, declaredBytes = 4) {
    this.n = n;
    this.declaredBytes = declaredBytes;
  }

  async count(): Promise<number | null> {
    return this.n;
  }

  async *enumerate(): AsyncGenerator<GalleryAssetRef> {
    for (let i = 0; i < this.n; i++) {
      yield {
        assetId: `a${i}`,
        capturedAt: `2026-01-01T00:00:00.${String(i % 1000).padStart(3, "0")}Z`,
        bytes: this.declaredBytes,
      };
    }
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    const i = Number(asset.assetId.slice(1));
    // Unique bytes per asset so content-dedup doesn't collapse the batch.
    return new Uint8Array([i & 0xff, (i >> 8) & 0xff, (i >> 16) & 0xff, 1]);
  }
}

function memoryCache(): ScanCache {
  const contentByAsset = new Map<string, string>();
  return {
    async decide() {
      return "scan";
    },
    async hasContent(hash, exceptAssetId) {
      for (const [assetId, h] of contentByAsset) if (assetId !== exceptAssetId && h === hash) return true;
      return false;
    },
    async recordScanned({ assetId, contentHash }) {
      contentByAsset.set(assetId, contentHash);
    },
    async recordFailed() {},
    async invalidate(assetId) {
      contentByAsset.delete(assetId);
    },
    async clear() {
      contentByAsset.clear();
    },
  };
}

beforeEach(async () => {
  await db.slipScanRuns.clear();
});

describe("scan session stress / memory", () => {
  it("processes a large library with bounded (non-exploding) concurrency", async () => {
    const N = 600;
    const concurrency = 4;

    let inFlight = 0;
    let peak = 0;
    let processed = 0;
    const processor: ScanProcessor = {
      async process() {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 0));
        processed += 1;
        inFlight -= 1;
      },
    };

    const run = await createScanSession({
      provider: new StressProvider(N),
      options: { source: "stress", incremental: false, concurrency },
      cache: memoryCache(),
      processor,
    }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(N);
    expect(processed).toBe(N);
    // The memory-protection property: never more in flight than the worker cap.
    expect(peak).toBeLessThanOrEqual(concurrency);
    // ...and it genuinely ran in parallel.
    expect(peak).toBeGreaterThan(1);
  });

  it("ByteBudget, not just the worker cap, bounds in-flight images once they're realistically sized", async () => {
    // At the default budget (32MB) and DEFAULT_IMAGE_BYTES (2MB), 4 workers
    // never actually pressure ByteBudget -- 4 * 2MB is well under 32MB, so
    // the earlier test's peak<=concurrency bound is really just the worker
    // cap. Push concurrency past what the budget can support at a realistic
    // image size (4MB) to prove ByteBudget is a real, independent limiter,
    // not just documentation.
    const N = 500;
    const concurrency = 20;
    const imageBytes = 4 * 1024 * 1024; // 4MB/image
    const budgetBytes = 32 * 1024 * 1024; // scanSessionService's default
    const budgetImplied = Math.floor(budgetBytes / imageBytes); // 8

    let inFlight = 0;
    let peak = 0;
    const processor: ScanProcessor = {
      async process() {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 0));
        inFlight -= 1;
      },
    };

    const run = await createScanSession({
      provider: new StressProvider(N, imageBytes),
      options: { source: "stress-bytes", incremental: false, concurrency },
      cache: memoryCache(),
      processor,
    }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(N);
    // Bounded by the byte budget, well below the 20-worker cap.
    expect(peak).toBeLessThanOrEqual(budgetImplied);
    expect(peak).toBeLessThan(concurrency);
    expect(peak).toBeGreaterThan(1);
  });

  it("handles a 10k-image library with throttled checkpoint writes (not one write per image)", async () => {
    const N = 10_000;
    const updateSpy = vi.spyOn(db.slipScanRuns, "update");

    const processor: ScanProcessor = {
      async process() {
        await new Promise((resolve) => setTimeout(resolve, 0));
      },
    };

    const run = await createScanSession({
      provider: new StressProvider(N),
      options: { source: "stress-10k", incremental: false, concurrency: 4 },
      cache: memoryCache(),
      processor,
    }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(N);
    // Checkpoint throttling (every 2s or 50 items, whichever first) plus one
    // final flush -- nowhere near N writes for N items.
    expect(updateSpy.mock.calls.length).toBeLessThan(N / 10);

    updateSpy.mockRestore();
    // Passes in ~27s in isolation; under the full suite's parallel CPU
    // contention (the same class of flakiness as the project's other
    // documented full-suite-only timeouts) it can tip past 30s, so this
    // gets real headroom rather than a value tuned to just barely fit.
  }, 60_000);
});
