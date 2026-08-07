import { db } from "@/database/db";
import { CURRENT_ENGINE_VERSIONS, MAX_FAILED_RETRIES } from "@/features/finance/slipScanner/cache/scanCachePolicy";
import type { ScanCache } from "@/features/finance/slipScanner/cache/scanCache";

function nowIso(): string {
  return new Date().toISOString();
}

// Dexie-backed implementation of the ScanCache contract (device-local,
// unsynced slipScanCache table). Direct db access, like the other scanner
// repositories — createRepository is for synced entities only.
export const dexieScanCache: ScanCache = {
  async decide(assetId, lastModified, versions) {
    const entry = await db.slipScanCache.where("assetId").equals(assetId).first();
    if (!entry) return "scan";

    if (entry.status === "failed") {
      // Remembered failure: retry across scans up to the policy limit.
      return entry.failedAttempts < MAX_FAILED_RETRIES ? "scan" : "skip-failed";
    }

    const unchanged = entry.lastModified === lastModified;
    const fresh =
      entry.ocrVersion === versions.ocr &&
      entry.payloadVersion === versions.payload &&
      entry.parserVersion === versions.parser;
    // A cache hit only when both the image and the engine versions are the
    // same; a changed image or a stale (bumped-version) entry re-scans.
    return unchanged && fresh ? "skip-unchanged" : "scan";
  },

  async hasContent(contentHash, exceptAssetId) {
    const matches = await db.slipScanCache.where("contentHash").equals(contentHash).toArray();
    return matches.some((m) => m.assetId !== exceptAssetId);
  },

  async recordScanned({ assetId, contentHash, lastModified, runId, versions }) {
    const existing = await db.slipScanCache.where("assetId").equals(assetId).first();
    await db.slipScanCache.put({
      ...(existing?.id !== undefined ? { id: existing.id } : {}),
      assetId,
      contentHash,
      lastModified,
      scannedAt: nowIso(),
      status: "scanned",
      ocrVersion: versions.ocr,
      payloadVersion: versions.payload,
      parserVersion: versions.parser,
      failedAttempts: 0,
      runId,
    });
  },

  async recordFailed({ assetId, lastModified, runId }) {
    const existing = await db.slipScanCache.where("assetId").equals(assetId).first();
    const priorFailures = existing?.status === "failed" ? existing.failedAttempts : 0;
    await db.slipScanCache.put({
      ...(existing?.id !== undefined ? { id: existing.id } : {}),
      assetId,
      contentHash: existing?.contentHash,
      lastModified,
      scannedAt: nowIso(),
      status: "failed",
      ocrVersion: CURRENT_ENGINE_VERSIONS.ocr,
      payloadVersion: CURRENT_ENGINE_VERSIONS.payload,
      parserVersion: CURRENT_ENGINE_VERSIONS.parser,
      failedAttempts: priorFailures + 1,
      runId,
    });
  },

  async invalidate(assetId) {
    const entry = await db.slipScanCache.where("assetId").equals(assetId).first();
    if (entry?.id !== undefined) await db.slipScanCache.delete(entry.id);
  },

  async clear() {
    await db.slipScanCache.clear();
  },
};
