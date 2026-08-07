import { useCallback, useEffect, useState } from "react";

import { galleryPermissionService } from "@/features/finance/slipScanner/gallery/permission/galleryPermissionService";
import type { GalleryPermissionResult } from "@/features/finance/slipScanner/gallery/permission/galleryPermission.types";

// Foundation hook for the Gallery Scanner permission flow (GS-005). Checks
// the current status on mount, exposes an explicit `request` (the denial
// flow — updates the result so the UI can show a rationale/Settings CTA when
// `canRequestAgain` is false), and `recheck` (the recovery flow — call it
// after the user returns from system Settings). Business logic stays in
// galleryPermissionService; this hook only owns the React state.
export function useGalleryPermission() {
  const [result, setResult] = useState<GalleryPermissionResult | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let active = true;
    galleryPermissionService.check().then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(async () => {
    setRequesting(true);
    try {
      setResult(await galleryPermissionService.request());
    } finally {
      setRequesting(false);
    }
  }, []);

  const recheck = useCallback(async () => {
    setResult(await galleryPermissionService.check());
  }, []);

  return { result, requesting, request, recheck };
}
