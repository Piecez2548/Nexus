import { registerPlugin, type PermissionState } from "@capacitor/core";

// Capacitor core's PermissionState is 'prompt' | 'prompt-with-rationale' |
// 'granted' | 'denied'. Photo permissions on Android 14+ / iOS add a
// user-selected partial grant, surfaced by media plugins as "limited".
export type PhotosPermissionState = PermissionState | "limited";

// Native contract for reading gallery-image permission. Declared here (not
// installed yet) so the permission manager compiles and degrades gracefully
// today; a concrete native media plugin is wired on-device in a later GS
// task. `registerPlugin` returns a proxy that rejects when no native/web
// implementation is registered — galleryPermissionService catches that and
// reports "unavailable", so nothing throws before the plugin exists.
export interface GalleryPermissionsPlugin {
  checkPermissions(): Promise<{ photos: PhotosPermissionState }>;
  requestPermissions(): Promise<{ photos: PhotosPermissionState }>;
}

export const GalleryPermissions = registerPlugin<GalleryPermissionsPlugin>("GalleryPermissions");
