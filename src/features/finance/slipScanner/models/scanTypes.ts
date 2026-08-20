// Runtime + persisted types for the Gallery Scanner orchestration (GS-006).
// Deliberately plugin-agnostic — nothing here imports Capacitor or a media
// plugin, so the scanner logic stays platform-independent (native gallery
// enumeration is integrated later behind MediaProvider without touching this).

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

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
  // Bounds the scan to a user-picked date range (ISO "YYYY-MM-DD" or full
  // timestamp) instead of the whole gallery. When set, scanSessionService
  // forces this run to be non-incremental regardless of `incremental` above
  // -- a bounded, one-off range scan is never resumed from/into the shared
  // incremental cursor (see scanSessionService.ts's own comment on why).
  dateRange?: { from?: string; to?: string };
  // Optional scan-queue tuning (GS-007); resolved to dynamic/device defaults
  // when omitted.
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  maxInflightBytes?: number;
  // Progress-checkpoint persistence throttle (defaults in scanQueueConfig.ts).
  checkpointIntervalMs?: number;
  checkpointEveryN?: number;
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
  // Set only for a date-range-bounded scan. getResumable() excludes any run
  // with this set -- a paused/interrupted date-range run must never be
  // picked up as "the" resumable run by a later, differently-scoped normal
  // scan (its cursor is bounded to the range, not a valid general watermark).
  dateRange?: { from?: string; to?: string };
  total: number | null;
  done: number;
  skipped: number;
  failed: number;
}

export type ScanCacheStatus = "scanned" | "failed";

// One scan-cache entry per gallery image (the production scan cache, GS-008).
// Powers: skip-unchanged (assetId + lastModified), stale detection (version
// fields), duplicate prevention (contentHash), and the remembered-failure
// retry policy (status + failedAttempts). `id` is the internal image id;
// `assetId` is the gallery identity.
export interface ScanCacheEntry {
  id?: number; // Image ID (internal Dexie PK)
  assetId: string; // Asset ID (gallery identity)
  contentHash?: string; // Hash — absent for a failure that never reached hashing
  lastModified?: string; // Last Modified (asset.capturedAt at scan time)
  scannedAt: string; // Scan Timestamp
  status: ScanCacheStatus; // Scan Status
  ocrVersion: string; // OCR Version
  payloadVersion: string; // Payload Version
  parserVersion: string; // Parser Version
  failedAttempts: number; // cross-run failure count for the retry policy
  runId: number;
}

// One extracted slip candidate, persisted as soon as it's produced (BUG-05
// fix). Without this, a candidate lived only in transient React state: an
// interrupted scan (app kill, crash, reload) lost it permanently, and worse,
// a resume would skip re-extracting its asset entirely, since ScanCacheEntry
// already marks that asset "scanned". `thumbnailUrl` is deliberately never
// persisted here -- it's a blob: object URL, meaningless once the document
// that created it is gone; a restored candidate simply renders without one
// (ImportPreview already falls back gracefully when it's absent).
export interface ScanCandidateEntry {
  id?: number;
  runId: number;
  assetId: string;
  candidate: Omit<SlipCandidate, "thumbnailUrl">;
}
