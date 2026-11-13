import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GalleryPermissionResult } from "@/features/finance/slipScanner/gallery/permission/galleryPermission.types";
import { getScannerDiagnostics } from "./scannerDiagnostics";
import { runManualGalleryScan } from "./manualGalleryScan";

const granted: GalleryPermissionResult = { status: "granted", canScanGallery: true, canRequestAgain: false };
const denied: GalleryPermissionResult = { status: "denied", canScanGallery: false, canRequestAgain: true };

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("runManualGalleryScan", () => {
  it("uses an already-granted permission and starts exhaustive, non-incremental scan", async () => {
    const permission = { check: vi.fn().mockResolvedValue(granted), request: vi.fn() };
    const scan = vi.fn().mockResolvedValue(undefined);
    const onPermissionUnavailable = vi.fn();

    await expect(
      runManualGalleryScan({ permission, scan, onPermissionUnavailable, dateRange: { from: "2026-10-01" }, findBankAlbums: async () => null }),
    ).resolves.toBe(true);

    expect(permission.request).not.toHaveBeenCalled();
    expect(scan).toHaveBeenCalledWith(false, { from: "2026-10-01" }, true, undefined, undefined);
    expect(onPermissionUnavailable).not.toHaveBeenCalled();
  });

  it("limits the scan to bank albums when the device has them", async () => {
    const permission = { check: vi.fn().mockResolvedValue(granted), request: vi.fn() };
    const scan = vi.fn().mockResolvedValue(undefined);

    await runManualGalleryScan({ permission, scan, onPermissionUnavailable: vi.fn(), findBankAlbums: async () => ["kplus"] });

    expect(scan).toHaveBeenCalledWith(false, undefined, true, undefined, ["kplus"]);
  });

  it("scans the whole gallery when no bank album is found", async () => {
    const permission = { check: vi.fn().mockResolvedValue(granted), request: vi.fn() };
    const scan = vi.fn().mockResolvedValue(undefined);

    await runManualGalleryScan({ permission, scan, onPermissionUnavailable: vi.fn(), findBankAlbums: async () => [] });

    expect(scan).toHaveBeenCalledWith(false, undefined, true, undefined, undefined);
  });

  it("requests permission when needed and continues only after grant", async () => {
    const permission = { check: vi.fn().mockResolvedValue(denied), request: vi.fn().mockResolvedValue(granted) };
    const scan = vi.fn().mockResolvedValue(undefined);

    await expect(runManualGalleryScan({ permission, scan, onPermissionUnavailable: vi.fn() })).resolves.toBe(true);

    expect(permission.request).toHaveBeenCalledOnce();
    expect(scan).toHaveBeenCalledOnce();
  });

  it("does not scan when the permission request is denied", async () => {
    const permission = { check: vi.fn().mockResolvedValue(denied), request: vi.fn().mockResolvedValue(denied) };
    const scan = vi.fn();
    const onPermissionUnavailable = vi.fn();

    await expect(runManualGalleryScan({ permission, scan, onPermissionUnavailable })).resolves.toBe(false);

    expect(permission.request).toHaveBeenCalledOnce();
    expect(scan).not.toHaveBeenCalled();
    expect(onPermissionUnavailable).toHaveBeenCalledWith(denied);
  });

  it("handles an unavailable permission plugin without starting MediaStore access", async () => {
    const unavailable: GalleryPermissionResult = { status: "unavailable", canScanGallery: false, canRequestAgain: false };
    const permission = { check: vi.fn().mockRejectedValue(new Error("plugin unavailable")), request: vi.fn() };
    const scan = vi.fn();
    const onPermissionUnavailable = vi.fn();

    await expect(runManualGalleryScan({ permission, scan, onPermissionUnavailable })).resolves.toBe(false);

    expect(scan).not.toHaveBeenCalled();
    expect(onPermissionUnavailable).toHaveBeenCalledWith(unavailable);
  });

  it.each([
    { status: "denied", canScanGallery: false, canRequestAgain: false },
    { status: "blocked", canScanGallery: false, canRequestAgain: false },
    { status: "unavailable", canScanGallery: false, canRequestAgain: false },
  ] satisfies GalleryPermissionResult[])("does not enumerate when permission resolves to $status", async (result) => {
    const permission = { check: vi.fn().mockResolvedValue(result), request: vi.fn() };
    const scan = vi.fn();
    const onPermissionUnavailable = vi.fn();

    await expect(runManualGalleryScan({ permission, scan, onPermissionUnavailable })).resolves.toBe(false);

    expect(scan).not.toHaveBeenCalled();
    expect(onPermissionUnavailable).toHaveBeenCalledWith(result);
  });

  it("records only privacy-safe permission and scan stages", async () => {
    const permission = { check: vi.fn().mockResolvedValue(granted), request: vi.fn() };
    await runManualGalleryScan({ permission, scan: vi.fn().mockResolvedValue(undefined), onPermissionUnavailable: vi.fn() });

    expect(getScannerDiagnostics().slice(-3).map((event) => event.name)).toEqual([
      "MANUAL_SCAN_STARTED", "PERMISSION_CHECK", "PERMISSION_GRANTED",
    ]);
  });
});
