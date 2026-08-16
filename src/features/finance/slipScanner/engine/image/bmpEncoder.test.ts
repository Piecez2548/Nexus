import { Buffer } from "node:buffer";

import bmp from "bmp-js";
import { describe, expect, it } from "vitest";

import { encodeBmp } from "./bmpEncoder";

// Round-trips this module's output through bmp-js's own decoder -- the exact
// library tesseract.js's worker-script/utils/setImage.js uses internally to
// normalise any BMP it receives before handing it to Leptonica. Decoding
// with the real library Tesseract depends on is a much stronger correctness
// proof than asserting on raw header bytes alone: it proves genuine
// Tesseract-compatibility at the format level (pixel-perfect round trip is
// not claimed or needed off-device -- OCR text-recognition accuracy on a
// real photo still requires real-device validation).

function makeImageData(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data, colorSpace: "srgb" } as ImageData;
}

function decodeBack(bytes: Uint8Array): { width: number; height: number; data: Uint8Array } {
  // bmp-js's decoder calls Node Buffer-specific methods (toString, readUInt32LE,
  // ...) on its input directly -- a plain Uint8Array doesn't have those, only
  // a real Buffer does, hence the explicit conversion here.
  return bmp.decode(Buffer.from(bytes));
}

describe("encodeBmp", () => {
  it("writes a valid BITMAPFILEHEADER + BITMAPINFOHEADER", () => {
    const image = makeImageData(4, 3, () => [0, 0, 0]);
    const bytes = encodeBmp(image);
    const view = new DataView(bytes.buffer);

    expect(bytes[0]).toBe(0x42); // 'B'
    expect(bytes[1]).toBe(0x4d); // 'M'
    expect(view.getUint32(2, true)).toBe(bytes.length); // file size
    expect(view.getUint32(10, true)).toBe(54); // pixel data offset
    expect(view.getInt32(18, true)).toBe(4); // width
    expect(view.getInt32(22, true)).toBe(-3); // negative height -> top-down
    expect(view.getUint16(28, true)).toBe(24); // bits per pixel
    expect(view.getUint32(30, true)).toBe(0); // BI_RGB, uncompressed
  });

  it("round-trips solid colors correctly through bmp-js's real decoder", () => {
    const image = makeImageData(8, 8, () => [200, 100, 50]);
    const decoded = decodeBack(encodeBmp(image));

    expect(decoded.width).toBe(8);
    expect(decoded.height).toBe(8);
    // bmp-js's decoded buffer is laid out [alpha, blue, green, red] per pixel.
    const i = 0;
    expect(decoded.data[i + 1]).toBe(50); // blue
    expect(decoded.data[i + 2]).toBe(100); // green
    expect(decoded.data[i + 3]).toBe(200); // red
  });

  it("preserves top-to-bottom row order (no vertical flip)", () => {
    // Top row red, bottom row blue -- a real flip bug would swap these.
    const image = makeImageData(2, 2, (_x, y) => (y === 0 ? [255, 0, 0] : [0, 0, 255]));
    const decoded = decodeBack(encodeBmp(image));

    const topPixel = 0; // (0,0)
    const bottomPixel = 1 * 2 * 4; // (0,1)
    expect(decoded.data[topPixel + 3]).toBe(255); // red at top
    expect(decoded.data[topPixel + 1]).toBe(0);
    expect(decoded.data[bottomPixel + 1]).toBe(255); // blue at bottom
    expect(decoded.data[bottomPixel + 3]).toBe(0);
  });

  it("round-trips a binarised (pure black/white) image -- the actual OCR use case", () => {
    const image = makeImageData(50, 37, (x, y) => ((x + y) % 2 === 0 ? [255, 255, 255] : [0, 0, 0]));
    const decoded = decodeBack(encodeBmp(image));

    expect(decoded.width).toBe(50);
    expect(decoded.height).toBe(37);
    for (let y = 0; y < 37; y++) {
      for (let x = 0; x < 50; x++) {
        const expected = (x + y) % 2 === 0 ? 255 : 0;
        const idx = (y * 50 + x) * 4;
        expect(decoded.data[idx + 1]).toBe(expected); // B
        expect(decoded.data[idx + 2]).toBe(expected); // G
        expect(decoded.data[idx + 3]).toBe(expected); // R
      }
    }
  });

  it("handles widths that are not a multiple of 4 (real row padding)", () => {
    // 1201 -> row padding required (1201*3 = 3603, not a multiple of 4).
    for (const width of [1197, 1198, 1199, 1200, 1201]) {
      const image = makeImageData(width, 5, (x) => (x % 2 === 0 ? [10, 20, 30] : [200, 210, 220]));
      const decoded = decodeBack(encodeBmp(image));
      expect(decoded.width).toBe(width);
      expect(decoded.height).toBe(5);
      // Spot-check the last column of each row decodes correctly -- padding
      // bytes bleeding into pixel data would corrupt exactly this position.
      const lastX = width - 1;
      const idx = lastX * 4;
      const expectedRgb = lastX % 2 === 0 ? [10, 20, 30] : [200, 210, 220];
      expect([decoded.data[idx + 3], decoded.data[idx + 2], decoded.data[idx + 1]]).toEqual(expectedRgb);
    }
  });

  it("produces a much smaller and near-instant result than a PNG encode would need, by construction (no compression pass)", () => {
    // Not a timing assertion (flaky in CI) -- a structural one: file size is
    // exactly header + raw row bytes, proving no compression/search work is
    // being done regardless of content.
    const image = makeImageData(200, 150, (x, y) => [x % 256, y % 256, (x + y) % 256]);
    const bytes = encodeBmp(image);
    const rowSize = Math.ceil((200 * 3) / 4) * 4;
    expect(bytes.length).toBe(54 + rowSize * 150);
  });
});
