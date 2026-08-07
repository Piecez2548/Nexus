import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { createScanSession, type ScanSession } from "@/features/finance/slipScanner/services/scanSessionService";
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
  await db.slipScannedAssets.clear();
});

describe("createScanSession", () => {
  it("scans every image and persists a completed run", async () => {
    const provider = new FakeProvider([asset("a", 1, [1]), asset("b", 2, [2]), asset("c", 3, [3])]);
    const run = await createScanSession({ provider, options: { source: "fake", incremental: false } }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(3);
    expect(run.skipped).toBe(0);
    expect(await db.slipScannedAssets.count()).toBe(3);
  });

  it("prevents duplicates — identical content is scanned once", async () => {
    const provider = new FakeProvider([asset("a", 1, [9, 9]), asset("b", 2, [9, 9])]);
    const run = await createScanSession({ provider, options: { source: "fake", incremental: false } }).done;

    expect(run.done).toBe(1);
    expect(run.skipped).toBe(1);
  });

  it("incremental — a second scan skips already-scanned assets", async () => {
    const assets = [asset("a", 1, [1]), asset("b", 2, [2])];
    await createScanSession({ provider: new FakeProvider(assets), options: { source: "fake", incremental: true } }).done;

    const run2 = await createScanSession({ provider: new FakeProvider(assets), options: { source: "fake", incremental: true } }).done;
    expect(run2.done).toBe(0);
    expect(run2.skipped).toBe(2);
  });

  it("cancel stops the scan and marks the run cancelled", async () => {
    const provider = new FakeProvider([asset("a", 1, [1]), asset("b", 2, [2]), asset("c", 3, [3]), asset("d", 4, [4])]);
    let session: ScanSession;
    session = createScanSession({
      provider,
      options: { source: "fake", incremental: false },
      onProgress: (p) => {
        if (p.done === 1) session.control.cancel();
      },
    });

    const run = await session.done;
    expect(run.status).toBe("cancelled");
    expect(run.done).toBeLessThan(4);
  });

  it("pause halts progress and resume runs it to completion", async () => {
    const provider = new FakeProvider([asset("a", 1, [1]), asset("b", 2, [2]), asset("c", 3, [3])]);
    let session: ScanSession;
    session = createScanSession({
      provider,
      options: { source: "fake", incremental: false },
      onProgress: (p, s) => {
        if (p.done === 1 && s === "running") session.control.pause();
      },
    });

    await until(() => session.control.status === "paused");
    expect(session.control.status).toBe("paused");

    session.control.resume();
    const run = await session.done;
    expect(run.status).toBe("completed");
    expect(run.done).toBe(3);
  });
});
