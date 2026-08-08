// Scan progress computation (GS-034): derive the real-time dashboard metrics —
// speed, remaining, ETA, percent — from raw counters and elapsed time. Pure and
// deterministic (injectable clock); the dashboard component renders a snapshot.

export interface ScanProgressCounts {
  total: number | null; // total images to scan (null when unknown ahead of time)
  scanned: number;
  qrDetected: number;
  ocrProcessed: number;
  imported: number;
}

export interface ScanProgressSnapshot extends ScanProgressCounts {
  remaining: number | null;
  elapsedMs: number;
  speedPerSec: number; // scanned images per second
  etaMs: number | null; // estimated time to finish (null when total/speed unknown)
  percent: number | null; // 0–100 (null when total unknown)
}

export function computeScanProgress(
  counts: ScanProgressCounts,
  startedAt: number,
  now: number = Date.now(),
): ScanProgressSnapshot {
  const elapsedMs = Math.max(0, now - startedAt);
  const elapsedSec = elapsedMs / 1000;
  const speedPerSec = elapsedSec > 0 ? counts.scanned / elapsedSec : 0;
  const remaining = counts.total !== null ? Math.max(0, counts.total - counts.scanned) : null;
  const etaMs = remaining !== null && speedPerSec > 0 ? Math.round((remaining / speedPerSec) * 1000) : null;
  const percent =
    counts.total !== null && counts.total > 0 ? Math.min(100, Math.round((counts.scanned / counts.total) * 100)) : null;

  return { ...counts, remaining, elapsedMs, speedPerSec, etaMs, percent };
}

// Format a millisecond duration as "M:SS" (or "—" when unknown).
export function formatEta(etaMs: number | null): string {
  if (etaMs === null) return "—";
  const totalSec = Math.round(etaMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
