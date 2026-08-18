import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsNativePlatform = vi.fn();
const mockGalleryCheck = vi.fn();
const mockGalleryRequest = vi.fn();
const mockGeoCheckPermissions = vi.fn();
const mockGeoRequestPermissions = vi.fn();
const mockLnCheckPermissions = vi.fn();
const mockLnRequestPermissions = vi.fn();
const mockNotifCheckAccess = vi.fn();
const mockNotifOpenAccessSettings = vi.fn();
const mockAppSettingsOpen = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mockIsNativePlatform() },
}));

vi.mock("@capacitor/geolocation", () => ({
  Geolocation: {
    checkPermissions: (...args: unknown[]) => mockGeoCheckPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockGeoRequestPermissions(...args),
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: (...args: unknown[]) => mockLnCheckPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockLnRequestPermissions(...args),
  },
}));

vi.mock("@/features/finance/slipScanner/gallery/permission/galleryPermissionService", () => ({
  galleryPermissionService: {
    check: (...args: unknown[]) => mockGalleryCheck(...args),
    request: (...args: unknown[]) => mockGalleryRequest(...args),
  },
}));

vi.mock("@/features/finance/notificationCapture/native/notificationCapturePlugin", () => ({
  PaymentNotificationCapture: {
    checkAccess: (...args: unknown[]) => mockNotifCheckAccess(...args),
    openAccessSettings: (...args: unknown[]) => mockNotifOpenAccessSettings(...args),
  },
}));

vi.mock("./appSettingsPlugin", () => ({
  AppSettings: {
    open: (...args: unknown[]) => mockAppSettingsOpen(...args),
  },
}));

const { listPermissions } = await import("./permissionManagerService");

describe("listPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNativePlatform.mockReturnValue(true);
    mockGalleryCheck.mockResolvedValue({ status: "granted", canScanGallery: true, canRequestAgain: false });
    mockGeoCheckPermissions.mockResolvedValue({ location: "granted" });
    mockLnCheckPermissions.mockResolvedValue({ display: "granted" });
    mockNotifCheckAccess.mockResolvedValue({ granted: true });
  });

  it("returns 'unavailable' for all four entries on web, without calling any native API", async () => {
    mockIsNativePlatform.mockReturnValue(false);

    const entries = await listPermissions();

    expect(entries).toEqual([
      { key: "gallery", status: "unavailable" },
      { key: "location", status: "unavailable" },
      { key: "localNotifications", status: "unavailable" },
      { key: "notificationAccess", status: "unavailable" },
    ]);
    expect(mockGalleryCheck).not.toHaveBeenCalled();
    expect(mockGeoCheckPermissions).not.toHaveBeenCalled();
  });

  it("reflects granted status for all four on native, with no request/openSettings actions", async () => {
    const entries = await listPermissions();

    for (const entry of entries) {
      expect(entry.status).toBe("granted");
      expect(entry.request).toBeUndefined();
      expect(entry.openSettings).toBeUndefined();
    }
  });

  it("gallery: exposes request() when canRequestAgain is true, none when blocked", async () => {
    mockGalleryCheck.mockResolvedValue({ status: "prompt", canScanGallery: false, canRequestAgain: true });
    let entries = await listPermissions();
    expect(entries[0].request).toBeDefined();
    expect(entries[0].openSettings).toBeUndefined();

    mockGalleryCheck.mockResolvedValue({ status: "blocked", canScanGallery: false, canRequestAgain: false });
    entries = await listPermissions();
    expect(entries[0].request).toBeUndefined();
    expect(entries[0].openSettings).toBeDefined();
  });

  it("location: request() resolves to the status returned by the native request call", async () => {
    mockGeoCheckPermissions.mockResolvedValue({ location: "prompt" });
    mockGeoRequestPermissions.mockResolvedValue({ location: "granted" });

    const entries = await listPermissions();
    const location = entries.find((e) => e.key === "location")!;
    expect(location.status).toBe("prompt");
    expect(location.request).toBeDefined();

    const result = await location.request!();
    expect(result).toBe("granted");
  });

  it("location: a request that comes back denied after an already-denied check reports 'blocked'", async () => {
    mockGeoCheckPermissions.mockResolvedValue({ location: "denied" });
    mockGeoRequestPermissions.mockResolvedValue({ location: "denied" });

    const entries = await listPermissions();
    const location = entries.find((e) => e.key === "location")!;
    const result = await location.request!();

    expect(result).toBe("blocked");
  });

  it("localNotifications: maps prompt-with-rationale to 'prompt' and exposes request()", async () => {
    mockLnCheckPermissions.mockResolvedValue({ display: "prompt-with-rationale" });

    const entries = await listPermissions();
    const localNotifications = entries.find((e) => e.key === "localNotifications")!;

    expect(localNotifications.status).toBe("prompt");
    expect(localNotifications.request).toBeDefined();
  });

  it("notificationAccess: denied exposes openSettings (its own dedicated one) but never request()", async () => {
    mockNotifCheckAccess.mockResolvedValue({ granted: false });

    const entries = await listPermissions();
    const notificationAccess = entries.find((e) => e.key === "notificationAccess")!;

    expect(notificationAccess.status).toBe("denied");
    expect(notificationAccess.request).toBeUndefined();
    expect(notificationAccess.openSettings).toBeDefined();

    await notificationAccess.openSettings!();
    expect(mockNotifOpenAccessSettings).toHaveBeenCalledTimes(1);
    expect(mockAppSettingsOpen).not.toHaveBeenCalled();
  });

  it("a blocked runtime permission's openSettings calls the generic AppSettings plugin, not the notification-specific one", async () => {
    mockGeoCheckPermissions.mockResolvedValue({ location: "denied" });
    mockGeoRequestPermissions.mockResolvedValue({ location: "denied" });

    const entries = await listPermissions();
    const location = entries.find((e) => e.key === "location")!;
    await location.request!(); // observes "blocked", but listPermissions() itself is a plain check --
    // openSettings on the returned entry still reflects the pre-request "denied" check, matching
    // galleryPermissionService's own documented limitation (a plain check() never yields "blocked").
    expect(location.openSettings).toBeUndefined();

    // Re-list to get an entry whose *status* actually reads "blocked" isn't
    // possible from check() alone (see service comment) -- so instead verify
    // the openSettings wiring directly via the gallery entry, which starts
    // pre-blocked from its own check() result.
    mockGalleryCheck.mockResolvedValue({ status: "blocked", canScanGallery: false, canRequestAgain: false });
    const [gallery] = await listPermissions();
    await gallery.openSettings!();
    expect(mockAppSettingsOpen).toHaveBeenCalledTimes(1);
  });
});
