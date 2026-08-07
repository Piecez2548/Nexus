// Unified gallery-permission status the app reasons about, spanning:
//   • Android 13 (API 33) — READ_MEDIA_IMAGES (all-or-nothing).
//   • Android 14+ (API 34+) — READ_MEDIA_VISUAL_USER_SELECTED, the
//     user-selected partial grant → "limited".
//   • Android 15 (API 35) — same model, refined partial-access UX.
//   • Web — no OS gallery to enumerate → "unavailable" (the scanner falls
//     back to the file picker, which needs no permission).
export type GalleryPermissionStatus =
  | "granted" // full read access to gallery images
  | "limited" // partial access — a user-selected subset (Android 14+)
  | "prompt" // not yet requested; requesting will show the OS dialog
  | "denied" // denied but still re-requestable (soft denial)
  | "blocked" // permanently denied ("don't ask again") → recover via Settings
  | "unavailable"; // platform can't enumerate a gallery (web) — use the picker

export interface GalleryPermissionResult {
  status: GalleryPermissionStatus;
  // true when the gallery can actually be scanned (granted or limited)
  canScanGallery: boolean;
  // false once a re-request is pointless (blocked → Settings; unavailable → n/a)
  canRequestAgain: boolean;
}
