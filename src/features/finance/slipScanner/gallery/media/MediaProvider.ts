import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

export interface MediaProviderCapabilities {
  // true when the provider can list images on its own (native gallery);
  // false when images must be supplied to it (the web file picker).
  canEnumerate: boolean;
  // true when the platform gates access behind a runtime permission.
  needsPermission: boolean;
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
  count(sinceCursor?: string): Promise<number | null>;

  // Streams assets oldest-first. `sinceCursor` (an ISO capturedAt) lets an
  // incremental scan resume past what a previous run already covered.
  enumerate(sinceCursor?: string): AsyncIterable<GalleryAssetRef>;

  // Raw bytes of one asset, read on demand (never all at once) so large
  // galleries don't balloon memory.
  readBytes(asset: GalleryAssetRef): Promise<Uint8Array>;
}
