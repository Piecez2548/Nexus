import { useCallback } from "react";

import { useScanStore } from "@/features/finance/slipScanner/store/scanStore";
import { WebPickerProvider } from "@/features/finance/slipScanner/gallery/media/WebPickerProvider";
import { NativeMediaProvider } from "@/features/finance/slipScanner/gallery/media/NativeMediaProvider";

// UI entry point for the Gallery Scanner. Picks the platform MediaProvider
// and drives the scan store — the scanner logic stays plugin-agnostic, so
// wiring a real native media provider later doesn't touch this hook beyond
// swapping the NativeMediaProvider construction.
export function useGalleryScan() {
  const status = useScanStore((s) => s.status);
  const progress = useScanStore((s) => s.progress);
  const error = useScanStore((s) => s.error);
  const start = useScanStore((s) => s.start);
  const pause = useScanStore((s) => s.pause);
  const resume = useScanStore((s) => s.resume);
  const cancel = useScanStore((s) => s.cancel);

  // Web: scan the images the user picked via the file input.
  const scanPickedFiles = useCallback(
    (files: File[], incremental = true) => start(new WebPickerProvider(files), { source: "web-picker", incremental }),
    [start]
  );

  // Native: full-gallery scan (no assets until the media plugin is wired).
  const scanNativeGallery = useCallback(
    (incremental = true) => start(new NativeMediaProvider(), { source: "native-media", incremental }),
    [start]
  );

  return { status, progress, error, pause, resume, cancel, scanPickedFiles, scanNativeGallery };
}
