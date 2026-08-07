export interface EngineVersions {
  ocr: string;
  payload: string;
  parser: string;
}

export type CacheDecision =
  | "scan" // new, changed, stale (version bump), or a failed entry still within the retry policy
  | "skip-unchanged" // cache hit — already scanned, same last-modified, same engine versions
  | "skip-failed"; // remembered failure whose cross-run retries are exhausted

// The cache contract the scan orchestration depends on. Deliberately free of
// Dexie and any plugin, so the orchestration and the queue stay independent of
// the concrete cache implementation (dexieScanCache) — swapping the backing
// store, or injecting a fake in tests, needs no scanner changes.
export interface ScanCache {
  // Decide what to do with an asset before its bytes are read (skip-unchanged
  // is the incremental cache hit; stale/changed/retryable-failure → scan).
  decide(assetId: string, lastModified: string | undefined, versions: EngineVersions): Promise<CacheDecision>;

  // Cross-asset content duplicate check (after hashing). Excludes the asset's
  // own prior entry so a stale/changed re-scan of the *same* image isn't
  // mistaken for a duplicate of itself.
  hasContent(contentHash: string, exceptAssetId: string): Promise<boolean>;

  recordScanned(input: {
    assetId: string;
    contentHash: string;
    lastModified?: string;
    runId: number;
    versions: EngineVersions;
  }): Promise<void>;

  recordFailed(input: { assetId: string; lastModified?: string; runId: number }): Promise<void>;

  invalidate(assetId: string): Promise<void>;
  clear(): Promise<void>;
}
