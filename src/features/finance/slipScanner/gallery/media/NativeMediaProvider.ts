import { base64ToBytes } from "@/features/encryption/crypto/encryption";
import { NativeGalleryMedia } from "@/features/finance/slipScanner/gallery/media/nativeGalleryMediaPlugin";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { MediaCursorBounds, MediaProvider, MediaProviderCapabilities } from "./MediaProvider";
import { mediaCursorMs } from "./mediaCursorBoundary";
import { errorCategory, recordScannerDiagnostic } from "@/features/finance/slipScanner/services/scannerDiagnostics";

// Assets fetched per page() round trip -- bounds one call's response size
// regardless of how large the on-device gallery is. Exported so tests can
// build a realistic "full page, so fetch another" fixture without guessing.
export const PAGE_SIZE = 200;

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
    const startedAt = Date.now();
    try {
      const { total } = await NativeGalleryMedia.count({
        sinceCursorMs: mediaCursorMs(bounds?.since),
        untilCursorMs: mediaCursorMs(bounds?.until, true),
      });
      recordScannerDiagnostic("DATE_FILTER_COMPLETED", { count: total, durationMs: Date.now() - startedAt });
      return total;
    } catch (error) {
      recordScannerDiagnostic("SCAN_FAILED", { errorCategory: errorCategory(error), durationMs: Date.now() - startedAt });
      throw error;
    }
  }

  async *enumerate(bounds?: MediaCursorBounds): AsyncGenerator<GalleryAssetRef> {
    const startedAt = Date.now();
    const sinceCursorMs = mediaCursorMs(bounds?.since);
    const untilCursorMs = mediaCursorMs(bounds?.until, true);
    let offset = 0;
    let totalEnumerated = 0;
    let exhausted = false;
    recordScannerDiagnostic("MEDIA_ENUMERATION_STARTED");

    try {
      for (;;) {
        const { assets } = await NativeGalleryMedia.page({ sinceCursorMs, untilCursorMs, offset, limit: PAGE_SIZE });
        if (assets.length === 0) {
          exhausted = true;
          return;
        }

        totalEnumerated += assets.length;
        for (const asset of assets) {
          yield { assetId: asset.assetId, capturedAt: asset.capturedAt, bytes: asset.bytes, filename: asset.filename };
        }

        if (assets.length < PAGE_SIZE) {
          exhausted = true;
          return;
        }
        offset += assets.length;
      }
    } catch (error) {
      recordScannerDiagnostic("SCAN_FAILED", { errorCategory: errorCategory(error), durationMs: Date.now() - startedAt });
      throw error;
    } finally {
      if (exhausted) recordScannerDiagnostic("MEDIA_ENUMERATION_COMPLETED", { count: totalEnumerated, durationMs: Date.now() - startedAt });
    }
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    const startedAt = Date.now();
    recordScannerDiagnostic("IMAGE_ACCESS_STARTED");
    try {
      const { data } = await NativeGalleryMedia.readBytes({ assetId: asset.assetId });
      return base64ToBytes(data);
    } catch (error) {
      recordScannerDiagnostic("IMAGE_ACCESS_FAILED", { errorCategory: errorCategory(error), durationMs: Date.now() - startedAt });
      throw error;
    }
  }
}
