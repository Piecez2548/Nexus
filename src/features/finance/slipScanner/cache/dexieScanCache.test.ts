import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { dexieScanCache } from "@/features/finance/slipScanner/cache/dexieScanCache";
import { MAX_FAILED_RETRIES } from "@/features/finance/slipScanner/cache/scanCachePolicy";
import type { EngineVersions } from "@/features/finance/slipScanner/cache/scanCache";

const V: EngineVersions = { ocr: "1", payload: "1", parser: "1" };

beforeEach(async () => {
  await db.slipScanCache.clear();
});

describe("dexieScanCache", () => {
  it("scans a new asset, then reports a cache hit when it is unchanged", async () => {
    expect(await dexieScanCache.decide("a", "m1", V)).toBe("scan");
    await dexieScanCache.recordScanned({ assetId: "a", contentHash: "h", lastModified: "m1", runId: 1, versions: V });
    expect(await dexieScanCache.decide("a", "m1", V)).toBe("skip-unchanged");
  });

  it("re-scans a changed asset (last-modified differs)", async () => {
    await dexieScanCache.recordScanned({ assetId: "a", contentHash: "h", lastModified: "m1", runId: 1, versions: V });
    expect(await dexieScanCache.decide("a", "m2", V)).toBe("scan");
  });

  it("re-scans a stale asset when an engine version bumps", async () => {
    await dexieScanCache.recordScanned({ assetId: "a", contentHash: "h", lastModified: "m1", runId: 1, versions: V });
    expect(await dexieScanCache.decide("a", "m1", { ...V, parser: "2" })).toBe("scan");
  });

  it("remembers failures, retries up to the policy limit, then skips", async () => {
    for (let i = 0; i < MAX_FAILED_RETRIES; i++) {
      expect(await dexieScanCache.decide("f", "m1", V)).toBe("scan");
      await dexieScanCache.recordFailed({ assetId: "f", lastModified: "m1", runId: 1 });
    }
    expect(await dexieScanCache.decide("f", "m1", V)).toBe("skip-failed");
  });

  it("excludes an asset's own entry from the content-duplicate check", async () => {
    await dexieScanCache.recordScanned({ assetId: "a", contentHash: "shared", lastModified: "m1", runId: 1, versions: V });
    expect(await dexieScanCache.hasContent("shared", "a")).toBe(false); // its own entry
    expect(await dexieScanCache.hasContent("shared", "b")).toBe(true); // a different asset
  });

  it("supports invalidation and clearing", async () => {
    await dexieScanCache.recordScanned({ assetId: "a", contentHash: "h", lastModified: "m1", runId: 1, versions: V });
    await dexieScanCache.invalidate("a");
    expect(await dexieScanCache.decide("a", "m1", V)).toBe("scan");

    await dexieScanCache.recordScanned({ assetId: "b", contentHash: "h2", lastModified: "m1", runId: 1, versions: V });
    await dexieScanCache.clear();
    expect(await dexieScanCache.decide("b", "m1", V)).toBe("scan");
  });
});
