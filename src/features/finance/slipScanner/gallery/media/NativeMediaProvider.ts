import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { MediaProvider, MediaProviderCapabilities } from "./MediaProvider";

// Stub for the future native gallery integration. It satisfies the
// MediaProvider contract so the scan orchestration compiles and runs today
// (it simply yields no assets), and a real Capacitor media plugin fills in
// count/enumerate/readBytes on-device later WITHOUT changing any scanner
// logic — that's the whole point of the adapter boundary. Deliberately does
// NOT import any plugin, keeping the module tree plugin-free until one is
// chosen.
export class NativeMediaProvider implements MediaProvider {
  readonly id = "native-media";
  readonly capabilities: MediaProviderCapabilities = { canEnumerate: true, needsPermission: true };

  async count(): Promise<number | null> {
    // Unknown until a media plugin is wired; 0 keeps progress well-defined.
    return 0;
  }

  async *enumerate(): AsyncGenerator<GalleryAssetRef> {
    // No native media plugin wired yet → no assets. Replaced on-device by a
    // real enumeration that streams the gallery; scanner logic is unchanged.
    for (const asset of [] as GalleryAssetRef[]) yield asset;
  }

  async readBytes(): Promise<Uint8Array> {
    throw new Error("NativeMediaProvider: native media plugin not wired yet");
  }
}
