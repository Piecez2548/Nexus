// Coalesces the scan session's per-item DB checkpoint writes: at 50k images,
// writing db.slipScanRuns.update() on every single settled item is 50k Dexie
// writes for one run. shouldFlush() answers "is it time to persist progress
// again yet" — true on the first call, then true again only after `everyN`
// items or `intervalMs` have passed, whichever comes first. Time-based so a
// slow batch (large images, real OCR) still checkpoints promptly even if it
// hasn't hit the item count; count-based so a fast batch doesn't wait out the
// whole interval before ever persisting. Injectable clock for tests.
export function createCheckpointThrottle(
  intervalMs: number,
  everyN: number,
  now: () => number = () => Date.now(),
): { shouldFlush: () => boolean } {
  let lastFlush = -Infinity;
  let sinceFlush = 0;

  return {
    shouldFlush(): boolean {
      sinceFlush += 1;
      const elapsed = now() - lastFlush;
      if (sinceFlush >= everyN || elapsed >= intervalMs) {
        lastFlush = now();
        sinceFlush = 0;
        return true;
      }
      return false;
    },
  };
}
