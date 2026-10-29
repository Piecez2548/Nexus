import { galleryPermissionService } from "@/features/finance/slipScanner/gallery/permission/galleryPermissionService";
import type { GalleryPermissionResult } from "@/features/finance/slipScanner/gallery/permission/galleryPermission.types";
import type { ScanOptions } from "@/features/finance/slipScanner/models/scanTypes";
import { errorCategory, recordScannerDiagnostic } from "@/features/finance/slipScanner/services/scannerDiagnostics";
import { MANUAL_GALLERY_SCAN_MODE } from "@/features/finance/slipScanner/services/scannerMode";

export interface ManualGalleryScanDependencies {
  permission?: Pick<typeof galleryPermissionService, "check" | "request">;
  scan: (incremental: boolean, dateRange: ScanOptions["dateRange"], exhaustive: boolean) => Promise<void>;
  onPermissionUnavailable: (result: GalleryPermissionResult) => void;
  dateRange?: ScanOptions["dateRange"];
}

// Shared production entry for an explicit native scan. Permission is resolved
// before any count/enumeration call; denied/blocked/unavailable states never
// fall through into MediaStore.
export async function runManualGalleryScan({
  permission = galleryPermissionService,
  scan,
  onPermissionUnavailable,
  dateRange,
}: ManualGalleryScanDependencies): Promise<boolean> {
  recordScannerDiagnostic("MANUAL_SCAN_STARTED");
  let result: GalleryPermissionResult;
  try {
    result = await permission.check();
    recordScannerDiagnostic("PERMISSION_CHECK");
    if (!result.canScanGallery && result.canRequestAgain) result = await permission.request();
  } catch (error) {
    recordScannerDiagnostic("PERMISSION_DENIED", { errorCategory: errorCategory(error) });
    onPermissionUnavailable({ status: "unavailable", canScanGallery: false, canRequestAgain: false });
    return false;
  }

  if (!result.canScanGallery) {
    recordScannerDiagnostic("PERMISSION_DENIED", {
      errorCategory: result.status === "unavailable" ? "native-media" : "permission",
    });
    onPermissionUnavailable(result);
    return false;
  }

  recordScannerDiagnostic("PERMISSION_GRANTED");
  // Manual is always a full, non-incremental extraction pass. Automatic
  // startup remains configured separately by GalleryScanFlow.
  await scan(MANUAL_GALLERY_SCAN_MODE.incremental, dateRange, MANUAL_GALLERY_SCAN_MODE.exhaustive);
  return true;
}
