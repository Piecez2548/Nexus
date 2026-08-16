import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzeImage } from "./imageEnhancer";

// jsdom has no image-decoding pipeline (createImageBitmap / OffscreenCanvas),
// so analyzeImage degrades to null here rather than throwing.
describe("analyzeImage off-browser", () => {
  it("returns null when no browser image pipeline is available", async () => {
    expect(await analyzeImage(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

// Fakes just enough of the browser image pipeline to verify the resize
// contract with createImageBitmap -- same approach as
// engine/qr/imageDataDecoder.test.ts. Unlike the QR path, the stats sample is
// always drawn into a fixed square regardless of the source's aspect ratio,
// so there is no single-axis-only concern here: both resizeWidth and
// resizeHeight are expected.
class FakeCtx {
  drawImage = vi.fn();
  getImageData(_x: number, _y: number, w: number, h: number): ImageData {
    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4), colorSpace: "srgb" } as ImageData;
  }
}

class FakeOffscreenCanvas {
  width: number;
  height: number;
  ctx = new FakeCtx();
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getContext(): FakeCtx {
    return this.ctx;
  }
}

function stubBitmap(width: number, height: number) {
  const createImageBitmap = vi.fn(async (_source: unknown, options?: { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }) => {
    if (!options) return { width, height, close: vi.fn() };
    return { width: options.resizeWidth ?? width, height: options.resizeHeight ?? height, close: vi.fn() };
  });
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
  return createImageBitmap;
}

describe("analyzeImage with a faked browser image pipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes straight to the 64x64 stats sample for a large (real-photo-sized) source", async () => {
    const createImageBitmap = stubBitmap(3072, 4096); // real on-device sample
    await analyzeImage(new Uint8Array(4_732_739));

    expect(createImageBitmap).toHaveBeenCalledTimes(1);
    const [, options] = createImageBitmap.mock.calls[0] as [unknown, { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }];
    expect(options.resizeWidth).toBe(64);
    expect(options.resizeHeight).toBe(64);
    expect(options.resizeQuality).toBeDefined();
  });

  it("skips the resize hint for a small source, never upscaling", async () => {
    const createImageBitmap = stubBitmap(400, 300);
    await analyzeImage(new Uint8Array(50_000)); // below the resize-hint floor

    const [, options] = createImageBitmap.mock.calls[0] as [unknown, undefined];
    expect(options).toBeUndefined();
  });

  it("still returns real brightness/contrast stats from the decoded sample", async () => {
    stubBitmap(3072, 4096);
    const stats = await analyzeImage(new Uint8Array(4_732_739));
    expect(stats).not.toBeNull();
    expect(stats!.brightness).toBeGreaterThanOrEqual(0);
    expect(stats!.contrast).toBeGreaterThanOrEqual(0);
  });
});
