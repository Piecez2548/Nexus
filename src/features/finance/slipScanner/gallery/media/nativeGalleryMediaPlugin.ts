import { registerPlugin } from "@capacitor/core";

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
  count(options: { sinceCursorMs?: number }): Promise<{ total: number }>;
  page(options: { sinceCursorMs?: number; offset: number; limit: number }): Promise<{ assets: GalleryMediaAsset[] }>;
  // `data` is base64 (Capacitor's JSON bridge has no raw binary transport).
  readBytes(options: { assetId: string }): Promise<{ data: string }>;
}

export const NativeGalleryMedia = registerPlugin<NativeGalleryMediaPlugin>("GalleryPermissions");
