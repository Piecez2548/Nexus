import { base64ToBytes } from "@/features/encryption/crypto/encryption";
import { NativeGalleryMedia } from "@/features/finance/slipScanner/gallery/media/nativeGalleryMediaPlugin";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { MediaProvider, MediaProviderCapabilities } from "./MediaProvider";

// Assets fetched per page() round trip -- bounds one call's response size
// regardless of how large the on-device gallery is. Exported so tests can
// build a realistic "full page, so fetch another" fixture without guessing.
export const PAGE_SIZE = 200;

function cursorToMs(sinceCursor: string | undefined): number | undefined {
  if (!sinceCursor) return undefined;
  const ms = Date.parse(sinceCursor);
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

  async count(sinceCursor?: string): Promise<number | null> {
    const { total } = await NativeGalleryMedia.count({ sinceCursorMs: cursorToMs(sinceCursor) });
    return total;
  }

  async *enumerate(sinceCursor?: string): AsyncGenerator<GalleryAssetRef> {
    const sinceCursorMs = cursorToMs(sinceCursor);
    let offset = 0;

    for (;;) {
      const { assets } = await NativeGalleryMedia.page({ sinceCursorMs, offset, limit: PAGE_SIZE });
      if (assets.length === 0) return;

      for (const asset of assets) {
        yield { assetId: asset.assetId, capturedAt: asset.capturedAt, bytes: asset.bytes, filename: asset.filename };
      }

      if (assets.length < PAGE_SIZE) return; // short page -- no more to fetch
      offset += assets.length;
    }
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    // TEMPORARY perf-investigation instrumentation (gallery-scan speed
    // investigation, PERF task plan) — isolates the native plugin round trip
    // (file read + base64 encode + Capacitor bridge delivery) from the JS-side
    // base64 decode, since both are suspected costs and "4 concurrent workers"
    // doesn't parallelize either (Capacitor serializes all plugin calls
    // through one native HandlerThread + delivers every result via the single
    // UI thread's evaluateJavascript). Remove once confirmed/fixed.
    const bridgeStart = typeof performance !== "undefined" ? performance.now() : Date.now();
    const { data } = await NativeGalleryMedia.readBytes({ assetId: asset.assetId });
    const bridgeMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - bridgeStart;

    const decodeStart = typeof performance !== "undefined" ? performance.now() : Date.now();
    const bytes = base64ToBytes(data);
    const decodeMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - decodeStart;

    // NOTE: the WebView console bridge (Capacitor's onConsoleMessage) only
    // relays the first string argument -- an object argument collapses to
    // "[object Object]" in logcat. Everything must be inlined into one string.
    console.debug(
      `[perf-investigation] readBytes assetId=${asset.assetId} base64Chars=${data.length} bridgeMs=${Math.round(bridgeMs)} decodeMs=${Math.round(decodeMs)} decodedBytes=${bytes.length}`,
    );

    return bytes;
  }
}
