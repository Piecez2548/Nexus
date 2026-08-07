// Runtime + persisted types for the Gallery Scanner orchestration (GS-006).
// Deliberately plugin-agnostic — nothing here imports Capacitor or a media
// plugin, so the scanner logic stays platform-independent (native gallery
// enumeration is integrated later behind MediaProvider without touching this).

export type ScanStatus = "idle" | "running" | "paused" | "completed" | "cancelled" | "error";

// A single gallery image, as surfaced by any MediaProvider. `assetId` is the
// stable per-image identity used for incremental skip; `capturedAt` (ISO) is
// the incremental cursor axis.
export interface GalleryAssetRef {
  assetId: string;
  capturedAt?: string;
  bytes?: number;
  filename?: string;
}

export interface ScanProgress {
  total: number | null; // null when the provider can't count ahead of time
  done: number;
  skipped: number; // already-scanned (incremental) or duplicate content
  failed: number;
}

export interface ScanOptions {
  source: string; // provider id, e.g. "web-picker" | "native-media"
  incremental: boolean; // skip assets scanned in a previous run (via the cursor)
}

// ── Persisted (Dexie) — device-local, not synced ──

// One scan session; the running/paused row is the resumable checkpoint.
export interface SlipScanRun {
  id?: number;
  status: ScanStatus;
  source: string;
  startedAt: string;
  finishedAt?: string;
  cursor?: string; // last processed asset's capturedAt — resume/incremental watermark
  total: number | null;
  done: number;
  skipped: number;
  failed: number;
}

// One record per successfully scanned image — powers incremental scan
// (by assetId) and duplicate prevention (by contentHash).
export interface SlipScannedAsset {
  id?: number;
  assetId: string;
  contentHash: string;
  runId: number;
  scannedAt: string;
}
