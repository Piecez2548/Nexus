import { Capacitor } from "@capacitor/core";

import { GalleryPermissions, type PhotosPermissionState } from "./galleryPermissionPlugin";
import type { GalleryPermissionResult, GalleryPermissionStatus } from "./galleryPermission.types";

// Pure map from a native permission string to our unified status. Exported
// for unit testing — it's the one piece with real branching. A permanent
// "don't ask again" denial is derived in request() (a re-request that can no
// longer show a dialog), not here, since the raw string can't distinguish it.
export function mapPermissionState(state: PhotosPermissionState): GalleryPermissionStatus {
  switch (state) {
    case "granted":
      return "granted";
    case "limited":
      return "limited";
    case "denied":
      return "denied";
    case "prompt":
    case "prompt-with-rationale":
      return "prompt";
    default:
      return "prompt";
  }
}

export function buildResult(status: GalleryPermissionStatus): GalleryPermissionResult {
  return {
    status,
    canScanGallery: status === "granted" || status === "limited",
    canRequestAgain: status === "prompt" || status === "denied",
  };
}

// Mirrors biometricService.ts's shape: an isNativePlatform() guard, the
// native call wrapped in try/catch, and graceful degradation to a safe
// fallback ("unavailable") for the web target and for the not-yet-wired
// native plugin. No user data touched.
export const galleryPermissionService = {
  async check(): Promise<GalleryPermissionResult> {
    if (!Capacitor.isNativePlatform()) return buildResult("unavailable");

    try {
      const { photos } = await GalleryPermissions.checkPermissions();
      return buildResult(mapPermissionState(photos));
    } catch {
      // Native plugin not present yet — treat as no gallery access rather
      // than crashing; on-device wiring lands in a later GS task.
      return buildResult("unavailable");
    }
  },

  async request(): Promise<GalleryPermissionResult> {
    if (!Capacitor.isNativePlatform()) return buildResult("unavailable");

    try {
      const before = mapPermissionState((await GalleryPermissions.checkPermissions()).photos);
      if (before === "granted" || before === "limited") return buildResult(before);

      const after = mapPermissionState((await GalleryPermissions.requestPermissions()).photos);

      // A request that was already soft-denied and comes back still denied
      // (the OS no longer shows a dialog) is a permanent block — recovery
      // must go through system Settings, so it's no longer re-requestable.
      if (before === "denied" && after === "denied") return buildResult("blocked");
      return buildResult(after);
    } catch {
      return buildResult("unavailable");
    }
  },
};
