import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { MediaCursorBounds, MediaProvider, MediaProviderCapabilities } from "./MediaProvider";

// Web has no OS gallery to enumerate, so the "gallery" is whatever files the
// user picked via <input type="file" multiple> — passed in here. A stable
// per-file id is derived from name+size+lastModified (the web File API has no
// persistent asset id), which is enough for incremental/duplicate skip within
// and across picks of the same files.
export function webAssetId(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export class WebPickerProvider implements MediaProvider {
  readonly id = "web-picker";
  readonly capabilities: MediaProviderCapabilities = { canEnumerate: false, needsPermission: false };

  private readonly files: readonly File[];

  constructor(files: readonly File[]) {
    this.files = files;
  }

  async count(bounds?: MediaCursorBounds): Promise<number | null> {
    if (!bounds?.since && !bounds?.until) return this.files.length;
    let total = 0;
    for await (const _asset of this.enumerate(bounds)) total++;
    return total;
  }

  async *enumerate(bounds?: MediaCursorBounds): AsyncIterable<GalleryAssetRef> {
    const assets = this.files
      .map((file) => ({
        assetId: webAssetId(file),
        capturedAt: new Date(file.lastModified).toISOString(),
        bytes: file.size,
        filename: file.name,
      }))
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

    for (const asset of assets) {
      if (bounds?.since && asset.capturedAt <= bounds.since) continue;
      if (bounds?.until && asset.capturedAt > bounds.until) continue;
      yield asset;
    }
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    const file = this.files.find((f) => webAssetId(f) === asset.assetId);
    if (!file) throw new Error(`WebPickerProvider: no picked file for asset ${asset.assetId}`);
    return new Uint8Array(await file.arrayBuffer());
  }
}
