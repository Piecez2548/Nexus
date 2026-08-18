import { registerPlugin, type PermissionState } from "@capacitor/core";

// Capacitor core's PermissionState is 'prompt' | 'prompt-with-rationale' |
// 'granted' | 'denied'. Photo permissions on Android 14+ / iOS add a
// user-selected partial grant, surfaced by media plugins as "limited".
export type PhotosPermissionState = PermissionState | "limited";

// Native contract for reading gallery-image permission -- backed by
// GalleryMediaPlugin.java, registered under this exact Capacitor plugin
// name ("GalleryPermissions", not "GalleryMediaPlugin"; confirmed live via
// SEC-001's Permission Manager, which reads a real "granted"/"denied" status
// from it on-device). `registerPlugin` still returns a proxy that rejects on
// web (no native/web implementation there) -- galleryPermissionService
// catches that and reports "unavailable", so nothing throws.
export interface GalleryPermissionsPlugin {
  checkPermissions(): Promise<{ photos: PhotosPermissionState }>;
  requestPermissions(): Promise<{ photos: PhotosPermissionState }>;
}

export const GalleryPermissions = registerPlugin<GalleryPermissionsPlugin>("GalleryPermissions");
