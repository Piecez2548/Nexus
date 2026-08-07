// Tunables for the concurrent scan queue. Concurrency is derived dynamically
// from the device (leave one core for the UI, capped so image work never
// starves the main thread); the rest are conservative defaults a caller can
// override via ScanOptions.
export const DEFAULT_MAX_RETRIES = 2; // 1 initial attempt + 2 retries
export const DEFAULT_RETRY_DELAY_MS = 50; // linear backoff base (× attempt)
export const DEFAULT_MAX_INFLIGHT_BYTES = 32 * 1024 * 1024; // 32 MB budget
export const DEFAULT_IMAGE_BYTES = 2 * 1024 * 1024; // estimate when metadata omits size
const MAX_CONCURRENCY = 4;

export function resolveConcurrency(override?: number): number {
  if (override && override > 0) return override;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined;
  return Math.min(Math.max(1, (cores ?? 4) - 1), MAX_CONCURRENCY);
}
