import { afterEach, describe, expect, it, vi } from "vitest";

import { imageDataQrDecoder } from "./imageDataDecoder";
import { MAX_QR_DECODE_LONG_EDGE } from "./qrDecodeResize";

// jsdom has no image-decoding pipeline (createImageBitmap / OffscreenCanvas),
// so the decoder degrades to null here rather than throwing. Real decoding is
// exercised on-device / in a browser, not in this unit env — this test just
// pins the graceful-degradation contract the scanner relies on.
describe("imageDataQrDecoder", () => {
  it("returns null when no browser image pipeline is available", async () => {
    expect(await imageDataQrDecoder.decode(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

// Fakes just enough of the browser image pipeline to verify the *contract*
// with createImageBitmap (resize hint present/absent, single-axis only,
// never distorted) -- the actual resize/decode math is the browser's job,
// already trusted; qrDecodeResize.test.ts covers the pure cap arithmetic.
class FakeCtx {
  drawImage = vi.fn();
  getImageData(_x: number, _y: number, w: number, h: number): ImageData {
    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4), colorSpace: "srgb" } as ImageData;
  }
}

let createdCanvases: FakeOffscreenCanvas[] = [];

class FakeOffscreenCanvas {
  width: number;
  height: number;
  ctx = new FakeCtx();
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    createdCanvases.push(this);
  }
  getContext(): FakeCtx {
    return this.ctx;
  }
}

describe("imageDataQrDecoder with a faked browser image pipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    createdCanvases = [];
  });

  function stubBitmap(width: number, height: number) {
    const createImageBitmap = vi.fn(async (_source: unknown, options?: { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }) => {
      if (!options) return { width, height, close: vi.fn() };
      // Mimic the browser: single-axis resize computes the other axis
      // preserving aspect ratio; never clamped to natural size (can upscale).
      const resizedHeight = options.resizeHeight ?? Math.round(width * ((options.resizeWidth ?? width) / width));
      const resizedWidth = Math.round(width * (resizedHeight / height));
      return { width: resizedWidth, height: resizedHeight, close: vi.fn() };
    });
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    return createImageBitmap;
  }

  it("passes a resize hint, single-axis only, for a large (real-photo-sized) source", async () => {
    // Real on-device sample: 3072x4096, ~4.7MB.
    const createImageBitmap = stubBitmap(3072, 4096);
    const bytes = new Uint8Array(4_732_739);

    await imageDataQrDecoder.decode(bytes);

    expect(createImageBitmap).toHaveBeenCalledTimes(1);
    const [, options] = createImageBitmap.mock.calls[0] as [unknown, { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }];
    expect(options.resizeHeight).toBe(MAX_QR_DECODE_LONG_EDGE);
    expect(options.resizeWidth).toBeUndefined(); // single-axis only -- never distorts
    expect(options.resizeQuality).toBeDefined();
  });

  it("skips the resize hint for a small source, decoding at natural size instead of upscaling", async () => {
    const createImageBitmap = stubBitmap(400, 300);
    const bytes = new Uint8Array(50_000); // below the resize-hint floor

    await imageDataQrDecoder.decode(bytes);

    expect(createImageBitmap).toHaveBeenCalledTimes(1);
    const [, options] = createImageBitmap.mock.calls[0] as [unknown, undefined];
    expect(options).toBeUndefined();
  });

  it("caps the long edge even when the resized bitmap is landscape (width still over cap)", async () => {
    // A landscape 4096x3072 source: resizeHeight=1600 alone leaves width at
    // 1600*(4096/3072) ≈ 2133, over the cap -- the decoder must correct it
    // before jsQR ever sees the pixels.
    stubBitmap(4096, 3072);
    const bytes = new Uint8Array(4_732_739);

    await imageDataQrDecoder.decode(bytes);

    expect(createdCanvases).toHaveLength(1);
    const finalCanvas = createdCanvases[0];
    expect(finalCanvas.width).toBeLessThanOrEqual(MAX_QR_DECODE_LONG_EDGE);
    expect(finalCanvas.height).toBeLessThanOrEqual(MAX_QR_DECODE_LONG_EDGE);
    expect(Math.max(finalCanvas.width, finalCanvas.height)).toBe(MAX_QR_DECODE_LONG_EDGE);
    // Aspect ratio preserved end-to-end (4096:3072 == 4:3).
    expect(finalCanvas.width / finalCanvas.height).toBeCloseTo(4096 / 3072, 2);
  });
});
