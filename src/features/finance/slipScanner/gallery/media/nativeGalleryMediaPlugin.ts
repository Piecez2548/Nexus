import { GalleryPermissions } from "@/features/finance/slipScanner/gallery/permission/galleryPermissionPlugin";

export interface GalleryMediaAsset {
  assetId: string;
  capturedAt: string;
  bytes: number;
  filename: string;
}

// Native contract for MediaStore-backed gallery enumeration (Slip
// Intelligence Phase 8). Backed by the same native class/name as
// GalleryPermissions (galleryPermissionPlugin.ts) -- GalleryMediaPlugin.java
// implements both the permission methods and these; registerPlugin() with
// the same string name just returns another differently-typed proxy onto
// that one native registration.
export interface NativeGalleryMediaPlugin {
  count(options: { sinceCursorMs?: number; untilCursorMs?: number }): Promise<{ total: number }>;
  page(options: { sinceCursorMs?: number; untilCursorMs?: number; offset: number; limit: number }): Promise<{ assets: GalleryMediaAsset[] }>;
  // `data` is base64 (Capacitor's JSON bridge has no raw binary transport).
  readBytes(options: { assetId: string }): Promise<{ data: string }>;
}

// GalleryPermissions and NativeGalleryMedia are backed by the same native
// Capacitor registration. Reuse the existing proxy instead of calling
// registerPlugin a second time; duplicate registrations leak global state in
// web tests and produce a warning in the Android WebView.
export const NativeGalleryMedia = GalleryPermissions as unknown as NativeGalleryMediaPlugin;
