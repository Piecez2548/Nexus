// Tunables for the concurrent scan queue. Concurrency is derived dynamically
// from the device (leave one core for the UI, capped so image work never
// starves the main thread); the rest are conservative defaults a caller can
// override via ScanOptions.
export const DEFAULT_MAX_RETRIES = 2; // 1 initial attempt + 2 retries
export const DEFAULT_RETRY_DELAY_MS = 50; // linear backoff base (× attempt)
export const DEFAULT_MAX_INFLIGHT_BYTES = 32 * 1024 * 1024; // 32 MB budget
export const DEFAULT_IMAGE_BYTES = 2 * 1024 * 1024; // estimate when metadata omits size
// Checkpoint (progress persistence) throttle: at 50k images, writing on every
// settled item is 50k Dexie writes for one run. Flush at most every 2s, or
// every 50 items — whichever comes first, so a large batch still checkpoints
// promptly and a slow one (real OCR) doesn't wait out the whole interval.
export const DEFAULT_CHECKPOINT_INTERVAL_MS = 2000;
export const DEFAULT_CHECKPOINT_EVERY_N = 50;
// Exported so callers that need to size a resource pool to match the scan
// queue's own parallelism ceiling (e.g. the OCR worker pool) share this one
// number rather than duplicating it.
export const MAX_CONCURRENCY = 4;

export function resolveConcurrency(override?: number): number {
  if (override && override > 0) return override;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined;
  return Math.min(Math.max(1, (cores ?? 4) - 1), MAX_CONCURRENCY);
}
