import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// Secure disposal of transient scanner artifacts. Two things outlive a scan if
// not cleaned: decoded image bytes held in memory, and object-URLs backing
// thumbnails (which keep the underlying Blob alive and referenceable). These
// helpers wipe/release them explicitly rather than waiting on GC.

type RevokeFn = (url: string) => void;

function safeRevoke(url: string): void {
  try {
    if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
  } catch {
    // jsdom / restricted environments may not implement it — ignore.
  }
}

// Overwrite a decoded-image buffer with zeros once it is no longer needed, so a
// slip's pixels don't linger in a reused ArrayBuffer. Returns the same buffer.
export function wipeBytes(bytes: Uint8Array): Uint8Array {
  bytes.fill(0);
  return bytes;
}

// Release the object-URLs backing candidate thumbnails. `revoke` is injectable
// for tests. Returns how many URLs were revoked.
export function revokeThumbnails(candidates: readonly SlipCandidate[], revoke: RevokeFn = safeRevoke): number {
  let revoked = 0;
  for (const candidate of candidates) {
    if (candidate.thumbnailUrl) {
      revoke(candidate.thumbnailUrl);
      revoked += 1;
    }
  }
  return revoked;
}

// Full secure discard of a candidate set: release their thumbnails. (Cache
// purge is delegated to the ScanCache's own `clear`, which owns that store.)
export function secureDiscardCandidates(candidates: readonly SlipCandidate[], revoke: RevokeFn = safeRevoke): number {
  return revokeThumbnails(candidates, revoke);
}
