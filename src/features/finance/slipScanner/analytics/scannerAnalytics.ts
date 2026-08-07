// Scanner analytics: cumulative usage stats aggregated ACROSS scan runs over
// time — distinct from GS-018's per-run in-memory perf metrics, which measure a
// single run for tuning. This adds the QR/OCR/import dimensions the task lists
// and accumulates historically (persisted by the store). Pure aggregation +
// derivation here; persistence lives in the store.

export interface ScannerRunStats {
  imagesScanned: number;
  qrDetected: number;
  ocrUsed: number;
  cacheHits: number;
  duplicates: number;
  importSuccess: number;
  importFailed: number;
  scanMs: number;
}

export interface ScannerAnalyticsTotals extends ScannerRunStats {
  runs: number;
}

export interface ScannerAnalytics {
  totals: ScannerAnalyticsTotals;
  duplicateRate: number;
  qrDetectionRate: number;
  ocrUsageRate: number;
  cacheHitRate: number;
  importSuccessRate: number;
  averageScanSpeedPerSec: number; // images per second
  averageMsPerImage: number;
}

export function emptyTotals(): ScannerAnalyticsTotals {
  return {
    runs: 0,
    imagesScanned: 0,
    qrDetected: 0,
    ocrUsed: 0,
    cacheHits: 0,
    duplicates: 0,
    importSuccess: 0,
    importFailed: 0,
    scanMs: 0,
  };
}

// Fold one run's stats into the running totals (immutably).
export function mergeRun(totals: ScannerAnalyticsTotals, run: ScannerRunStats): ScannerAnalyticsTotals {
  return {
    runs: totals.runs + 1,
    imagesScanned: totals.imagesScanned + run.imagesScanned,
    qrDetected: totals.qrDetected + run.qrDetected,
    ocrUsed: totals.ocrUsed + run.ocrUsed,
    cacheHits: totals.cacheHits + run.cacheHits,
    duplicates: totals.duplicates + run.duplicates,
    importSuccess: totals.importSuccess + run.importSuccess,
    importFailed: totals.importFailed + run.importFailed,
    scanMs: totals.scanMs + run.scanMs,
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

// Derive the reportable rates and speeds from accumulated totals.
export function deriveAnalytics(totals: ScannerAnalyticsTotals): ScannerAnalytics {
  const imports = totals.importSuccess + totals.importFailed;
  return {
    totals,
    duplicateRate: ratio(totals.duplicates, totals.imagesScanned),
    qrDetectionRate: ratio(totals.qrDetected, totals.imagesScanned),
    ocrUsageRate: ratio(totals.ocrUsed, totals.imagesScanned),
    cacheHitRate: ratio(totals.cacheHits, totals.imagesScanned),
    importSuccessRate: ratio(totals.importSuccess, imports),
    averageScanSpeedPerSec: totals.scanMs > 0 ? totals.imagesScanned / (totals.scanMs / 1000) : 0,
    averageMsPerImage: ratio(totals.scanMs, totals.imagesScanned),
  };
}
