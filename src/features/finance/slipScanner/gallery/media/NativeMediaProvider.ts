import { base64ToBytes } from "@/features/encryption/crypto/encryption";
import { NativeGalleryMedia } from "@/features/finance/slipScanner/gallery/media/nativeGalleryMediaPlugin";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { MediaCursorBounds, MediaProvider, MediaProviderCapabilities } from "./MediaProvider";

// Assets fetched per page() round trip -- bounds one call's response size
// regardless of how large the on-device gallery is. Exported so tests can
// build a realistic "full page, so fetch another" fixture without guessing.
export const PAGE_SIZE = 200;

function cursorToMs(cursor: string | undefined): number | undefined {
  if (!cursor) return undefined;
  const ms = Date.parse(cursor);
  return Number.isNaN(ms) ? undefined : ms;
}

// Real on-device gallery enumeration (Slip Intelligence Phase 8), backed by
// GalleryMediaPlugin.java's MediaStore query methods. Replaces the
// zero-assets stub that let the scan orchestration compile and run before a
// native plugin existed -- scanner logic (scanSessionService.ts) is
// unchanged, since it only ever depended on the MediaProvider interface.
// enumerate() pages through the gallery PAGE_SIZE at a time rather than
// requesting everything in one call, so a large gallery is never held in
// memory or sent across the bridge at once; readBytes() decodes the plugin's
// base64 response (Capacitor's JSON bridge carries no raw binary).
export class NativeMediaProvider implements MediaProvider {
  readonly id = "native-media";
  readonly capabilities: MediaProviderCapabilities = { canEnumerate: true, needsPermission: true };

  async count(bounds?: MediaCursorBounds): Promise<number | null> {
    const { total } = await NativeGalleryMedia.count({
      sinceCursorMs: cursorToMs(bounds?.since),
      untilCursorMs: cursorToMs(bounds?.until),
    });
    return total;
  }

  async *enumerate(bounds?: MediaCursorBounds): AsyncGenerator<GalleryAssetRef> {
    const sinceCursorMs = cursorToMs(bounds?.since);
    const untilCursorMs = cursorToMs(bounds?.until);
    let offset = 0;

    for (;;) {
      const { assets } = await NativeGalleryMedia.page({ sinceCursorMs, untilCursorMs, offset, limit: PAGE_SIZE });
      if (assets.length === 0) return;

      for (const asset of assets) {
        yield { assetId: asset.assetId, capturedAt: asset.capturedAt, bytes: asset.bytes, filename: asset.filename };
      }

      if (assets.length < PAGE_SIZE) return; // short page -- no more to fetch
      offset += assets.length;
    }
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    const { data } = await NativeGalleryMedia.readBytes({ assetId: asset.assetId });
    return base64ToBytes(data);
  }
}
