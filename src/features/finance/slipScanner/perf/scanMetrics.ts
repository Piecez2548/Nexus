import type { CacheDecision } from "@/features/finance/slipScanner/cache/scanCache";

// Performance observability for a scan run. The mechanisms that make a
// 50,000-image library viable already exist — lazy provider enumeration (GS-006,
// nothing is buffered), the ByteBudget-bounded concurrent queue (GS-007, caps
// in-flight memory + parallelism), and the versioned skip-unchanged cache
// (GS-008, incremental re-scans). This layer *measures* them so the target can
// be validated and tuned: cache-hit ratio, throughput, peak in-flight memory,
// and the incremental skip rate. It stores only counters — no image data.

export interface ScanMetricsSnapshot {
  total: number;
  scanned: number;
  cacheHits: number; // skip-unchanged decisions
  skippedFailed: number; // skip-failed decisions (remembered failures)
  toScan: number; // scan decisions
  failed: number;
  duplicates: number;
  bytesProcessed: number;
  peakInFlightBytes: number;
  elapsedMs: number;
  cacheHitRatio: number; // cacheHits / total
  skipRatio: number; // (cacheHits + skippedFailed) / total
  throughputPerSec: number; // scanned / elapsed seconds
  avgBytesPerImage: number;
}

export interface ScanMetrics {
  onDecision: (decision: CacheDecision) => void;
  onScanned: (bytes: number) => void;
  onFailed: () => void;
  onDuplicate: () => void;
  observeInFlightBytes: (bytes: number) => void;
  snapshot: (now?: number) => ScanMetricsSnapshot;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function createScanMetrics(startedAt: number = Date.now()): ScanMetrics {
  let total = 0;
  let cacheHits = 0;
  let skippedFailed = 0;
  let toScan = 0;
  let scanned = 0;
  let failed = 0;
  let duplicates = 0;
  let bytesProcessed = 0;
  let peakInFlightBytes = 0;

  return {
    onDecision(decision) {
      total += 1;
      if (decision === "skip-unchanged") cacheHits += 1;
      else if (decision === "skip-failed") skippedFailed += 1;
      else toScan += 1;
    },
    onScanned(bytes) {
      scanned += 1;
      bytesProcessed += Math.max(0, bytes);
    },
    onFailed() {
      failed += 1;
    },
    onDuplicate() {
      duplicates += 1;
    },
    observeInFlightBytes(bytes) {
      if (bytes > peakInFlightBytes) peakInFlightBytes = bytes;
    },
    snapshot(now = Date.now()) {
      const elapsedMs = Math.max(0, now - startedAt);
      return {
        total,
        scanned,
        cacheHits,
        skippedFailed,
        toScan,
        failed,
        duplicates,
        bytesProcessed,
        peakInFlightBytes,
        elapsedMs,
        cacheHitRatio: ratio(cacheHits, total),
        skipRatio: ratio(cacheHits + skippedFailed, total),
        throughputPerSec: elapsedMs > 0 ? scanned / (elapsedMs / 1000) : 0,
        avgBytesPerImage: ratio(bytesProcessed, scanned),
      };
    },
  };
}
