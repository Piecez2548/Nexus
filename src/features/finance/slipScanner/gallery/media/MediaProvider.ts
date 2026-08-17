import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

export interface MediaProviderCapabilities {
  // true when the provider can list images on its own (native gallery);
  // false when images must be supplied to it (the web file picker).
  canEnumerate: boolean;
  // true when the platform gates access behind a runtime permission.
  needsPermission: boolean;
}

// Bounds for count()/enumerate() — `since` is the incremental-resume cursor
// (an ISO capturedAt, exclusive lower bound); `until` bounds a user-picked
// date range (inclusive upper bound, "YYYY-MM-DD" or a full ISO timestamp).
// The two are independent: a date-range scan sets `until` (and usually
// `since` too, for the range's start) without being an incremental resume.
export interface MediaCursorBounds {
  since?: string;
  until?: string;
}

// The single seam the scan orchestration depends on. Every platform (web
// picker today, native gallery later) implements this; scanSessionService
// never imports a concrete provider or any plugin, so wiring native
// enumeration later is a new MediaProvider implementation with zero changes
// to scanner logic.
export interface MediaProvider {
  readonly id: string;
  readonly capabilities: MediaProviderCapabilities;

  // Total images available (for progress `total`). null when unknowable
  // ahead of time — the scanner then reports an open-ended count.
  count(bounds?: MediaCursorBounds): Promise<number | null>;

  // Streams assets oldest-first, bounded by `bounds` (see MediaCursorBounds).
  enumerate(bounds?: MediaCursorBounds): AsyncIterable<GalleryAssetRef>;

  // Raw bytes of one asset, read on demand (never all at once) so large
  // galleries don't balloon memory.
  readBytes(asset: GalleryAssetRef): Promise<Uint8Array>;
}
