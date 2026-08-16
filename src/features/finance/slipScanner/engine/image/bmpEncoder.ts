// Minimal, pure, browser-safe BMP encoder (24-bit, uncompressed, top-down
// via negative height) -- an alternative to canvasToBytes's PNG/JPEG path
// (OffscreenCanvas.convertToBlob) for the OCR-preprocessed image specifically.
// Real-device testing found convertToBlob costs a fixed ~4.1s per call on
// this device regardless of image size or content, and regardless of format
// (PNG and JPEG measured identically) -- confirmed via a draw-only control
// (no encode) at 4ms that the cost is entirely inside convertToBlob itself,
// not canvas creation or pixel operations (see tasks/TASK_REGISTRY.md's OCR
// investigation). Tesseract's own worker-side code
// (node_modules/tesseract.js/src/worker-script/utils/setImage.js) already
// detects a BMP magic number and round-trips it through the bmp-js package
// before handing it to Leptonica -- so a valid BMP is a genuine, supported
// input, not a workaround. bmp-js's own encoder isn't reused directly here:
// it's built on Node's Buffer API (not natively available in a WebView) and
// expects an unusual per-pixel byte order that only produces correct output
// for an already-grayscale (R=G=B) source by coincidence. This encoder uses
// plain Uint8Array/DataView and standard 24-bit BGR rows, verified against
// bmp-js's decoder (the one Tesseract itself uses internally) by reading its
// source directly: negative height -> bottom_up=false -> reads the file
// top-down, matching how this encoder writes rows; its per-row padding
// skip (width % 4) is mathematically identical to the standard formula
// (4 - (width*3) % 4) % 4 for every possible width mod 4, not a mismatch.

const FILE_HEADER_SIZE = 14;
const INFO_HEADER_SIZE = 40;
const BYTES_PER_PIXEL = 3; // 24-bit RGB, no palette, no alpha

export function encodeBmp(image: ImageData): Uint8Array {
  const { width, height, data } = image;
  const rowSize = Math.ceil((width * BYTES_PER_PIXEL) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = FILE_HEADER_SIZE + INFO_HEADER_SIZE + pixelDataSize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // BITMAPFILEHEADER (14 bytes)
  buffer[0] = 0x42; // 'B'
  buffer[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true); // reserved
  view.setUint32(10, FILE_HEADER_SIZE + INFO_HEADER_SIZE, true); // pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, INFO_HEADER_SIZE, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative -> top-down row order, no vertical flip needed
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, BYTES_PER_PIXEL * 8, true); // bits per pixel
  view.setUint32(30, 0, true); // BI_RGB, uncompressed
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 0, true); // horizontal resolution (unspecified)
  view.setInt32(42, 0, true); // vertical resolution (unspecified)
  view.setUint32(46, 0, true); // colors used (no palette)
  view.setUint32(50, 0, true); // important colors

  const pixelStart = FILE_HEADER_SIZE + INFO_HEADER_SIZE;
  for (let y = 0; y < height; y++) {
    let rowOffset = pixelStart + y * rowSize;
    let srcIndex = y * width * 4;
    for (let x = 0; x < width; x++) {
      // BMP stores pixels in BGR order; source ImageData is RGBA. Alpha is
      // dropped -- 24-bit BMP has no alpha channel, and the OCR-preprocessed
      // image is already fully opaque (binarised black/white).
      buffer[rowOffset] = data[srcIndex + 2]!; // B
      buffer[rowOffset + 1] = data[srcIndex + 1]!; // G
      buffer[rowOffset + 2] = data[srcIndex]!; // R
      rowOffset += 3;
      srcIndex += 4;
    }
    // Remaining row-padding bytes (0-3, to reach a multiple of 4) are
    // already zero from the Uint8Array's initialization.
  }

  return buffer;
}
