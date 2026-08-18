import { Capacitor, type PermissionState } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";

import { galleryPermissionService } from "@/features/finance/slipScanner/gallery/permission/galleryPermissionService";
import { PaymentNotificationCapture } from "@/features/finance/notificationCapture/native/notificationCapturePlugin";
import { AppSettings } from "./appSettingsPlugin";
import type { GalleryPermissionStatus } from "@/features/finance/slipScanner/gallery/permission/galleryPermission.types";

export type PermissionKey = "gallery" | "location" | "localNotifications" | "notificationAccess";

// Reuses the gallery module's existing 6-value union (granted/limited/
// prompt/denied/blocked/unavailable) as the one unified status this whole
// service reasons about -- it already covers every state any of the four
// permission types below can be in, so there's nothing to add.
export type PermissionStatus = GalleryPermissionStatus;

export interface PermissionEntry {
  key: PermissionKey;
  status: PermissionStatus;
  // Present only when a genuine in-app OS request dialog exists for this
  // status. Resolves to the status actually observed after the request
  // (which the caller should use to update its own state), the same shape
  // useGalleryPermission.ts's request() already returns.
  request?: () => Promise<PermissionStatus>;
  // Present once the only remaining recovery path is the system Settings
  // screen -- either a permanently-denied ("blocked") runtime permission, or
  // Notification Access, which never has an in-app dialog at all.
  openSettings?: () => Promise<void>;
}

// Capacitor's standard 4-value PermissionState (Geolocation, Local
// Notifications) maps onto the unified status directly -- "limited" and
// "blocked" never come from this mapping alone, mirroring
// galleryPermissionService.ts's own mapPermissionState(): a plain check()
// can't distinguish a permanent denial from a re-requestable one on
// Android, only a request()'s before/after comparison can.
function mapCapacitorPermissionState(state: PermissionState): PermissionStatus {
  switch (state) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    case "prompt":
    case "prompt-with-rationale":
      return "prompt";
    default:
      return "prompt";
  }
}

// Same before/after technique galleryPermissionService.request() already
// uses: a re-request that was already denied and comes back still denied
// means the OS won't show the dialog again -- a permanent block, recoverable
// only via Settings.
async function requestWithBlockedDetection(
  check: () => Promise<PermissionState>,
  request: () => Promise<PermissionState>
): Promise<PermissionStatus> {
  const before = mapCapacitorPermissionState(await check());
  if (before === "granted") return before;

  const after = mapCapacitorPermissionState(await request());
  if (before === "denied" && after === "denied") return "blocked";
  return after;
}

async function galleryEntry(): Promise<PermissionEntry> {
  const result = await galleryPermissionService.check();
  return {
    key: "gallery",
    status: result.status,
    request: result.canRequestAgain
      ? async () => (await galleryPermissionService.request()).status
      : undefined,
    openSettings: result.status === "blocked" ? () => AppSettings.open() : undefined,
  };
}

async function locationEntry(): Promise<PermissionEntry> {
  const { location } = await Geolocation.checkPermissions();
  const status = mapCapacitorPermissionState(location);
  return {
    key: "location",
    status,
    request:
      status === "prompt" || status === "denied"
        ? () =>
            requestWithBlockedDetection(
              async () => (await Geolocation.checkPermissions()).location,
              async () => (await Geolocation.requestPermissions()).location
            )
        : undefined,
    openSettings: status === "blocked" ? () => AppSettings.open() : undefined,
  };
}

async function localNotificationsEntry(): Promise<PermissionEntry> {
  const { display } = await LocalNotifications.checkPermissions();
  const status = mapCapacitorPermissionState(display);
  return {
    key: "localNotifications",
    status,
    request:
      status === "prompt" || status === "denied"
        ? () =>
            requestWithBlockedDetection(
              async () => (await LocalNotifications.checkPermissions()).display,
              async () => (await LocalNotifications.requestPermissions()).display
            )
        : undefined,
    openSettings: status === "blocked" ? () => AppSettings.open() : undefined,
  };
}

async function notificationAccessEntry(): Promise<PermissionEntry> {
  const { granted } = await PaymentNotificationCapture.checkAccess();
  return {
    key: "notificationAccess",
    status: granted ? "granted" : "denied",
    // No in-app request dialog exists for this permission category at all
    // (see PaymentNotificationCapturePlugin.java's own header comment) --
    // Settings is the only path, from the very first check, not just after
    // a denial.
    openSettings: granted ? undefined : () => PaymentNotificationCapture.openAccessSettings(),
  };
}

// Every check here is native-only; each underlying service already
// degrades gracefully (mapPermissionState() etc.), but there's nothing
// meaningful to report on web at all, so this short-circuits before making
// four calls that would all resolve to the same "unavailable"-shaped answer.
export async function listPermissions(): Promise<PermissionEntry[]> {
  if (!Capacitor.isNativePlatform()) {
    return (["gallery", "location", "localNotifications", "notificationAccess"] as const).map((key) => ({
      key,
      status: "unavailable",
    }));
  }

  return Promise.all([galleryEntry(), locationEntry(), localNotificationsEntry(), notificationAccessEntry()]);
}
