import { GalleryPermissions } from "@/features/finance/slipScanner/gallery/permission/galleryPermissionPlugin";

export interface GalleryMediaAsset {
  assetId: string;
  capturedAt: string;
  bytes: number;
  filename: string;
}

// One MediaStore bucket (a gallery album/folder). `path` is the album's
// RELATIVE_PATH (e.g. "Pictures/K PLUS/") on Android 10+, "" before that.
export interface GalleryAlbum {
  id: string;
  name: string;
  path: string;
  count: number;
}

// Native contract for MediaStore-backed gallery enumeration (Slip
// Intelligence Phase 8). Backed by the same native class/name as
// GalleryPermissions (galleryPermissionPlugin.ts) -- GalleryMediaPlugin.java
// implements both the permission methods and these; registerPlugin() with
// the same string name just returns another differently-typed proxy onto
// that one native registration.
export interface NativeGalleryMediaPlugin {
  // `bucketIds` limits the query to those albums; omitted or empty = every album.
  count(options: { sinceCursorMs?: number; untilCursorMs?: number; bucketIds?: string[] }): Promise<{ total: number }>;
  page(options: { sinceCursorMs?: number; untilCursorMs?: number; bucketIds?: string[]; offset: number; limit: number }): Promise<{ assets: GalleryMediaAsset[] }>;
  // Albums with photo counts. Missing on APKs built before it was added.
  albums(): Promise<{ albums: GalleryAlbum[] }>;
  // `data` is base64 (Capacitor's JSON bridge has no raw binary transport).
  readBytes(options: { assetId: string }): Promise<{ data: string }>;
}

// GalleryPermissions and NativeGalleryMedia are backed by the same native
// Capacitor registration. Reuse the existing proxy instead of calling
// registerPlugin a second time; duplicate registrations leak global state in
// web tests and produce a warning in the Android WebView.
export const NativeGalleryMedia = GalleryPermissions as unknown as NativeGalleryMediaPlugin;
