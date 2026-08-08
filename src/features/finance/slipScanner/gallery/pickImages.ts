import { Capacitor } from "@capacitor/core";

// Whether on-device gallery picking is available (native platform only).
export function isNativeGalleryAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

// Pick images from the device gallery on a native platform via @capacitor/camera
// (dynamically imported so the plugin never enters the web bundle). Each picked
// photo's WebView-accessible path is fetched into a File, so the rest of the
// scan flow is identical to the web file-picker path. On web this returns []
// (the component's <input type=file> handles picking there). Validated on-device
// after `npx cap sync android` + rebuild.
export async function pickSlipImages(): Promise<File[]> {
  if (!Capacitor.isNativePlatform()) return [];

  const { Camera } = await import("@capacitor/camera");
  // quality 100 (minimal JPEG re-compression → sharper digits for OCR) and no
  // width/height so the picker keeps the image at full resolution — any
  // downscale would blur small slip numbers.
  const result = await Camera.pickImages({ quality: 100 });

  const files: File[] = [];
  for (let i = 0; i < result.photos.length; i++) {
    const photo = result.photos[i]!;
    const path = photo.webPath ?? photo.path;
    if (!path) continue;
    const response = await fetch(path);
    const blob = await response.blob();
    const format = photo.format || "jpg";
    files.push(
      new File([blob], `slip-${Date.now()}-${i}.${format}`, { type: blob.type || "image/jpeg" }),
    );
  }
  return files;
}
