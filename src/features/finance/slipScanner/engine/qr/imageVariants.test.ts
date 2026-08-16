import { afterEach, describe, expect, it, vi } from "vitest";

import { browserImageVariants } from "./imageVariants";
import { MAX_QR_DECODE_LONG_EDGE } from "./qrDecodeResize";

// Fakes just enough of the browser image pipeline to verify the resize-on-
// decode contract (resize hint present/absent, single-axis only, corrected
// for a landscape source) without depending on real image bytes -- the same
// approach as imageDataDecoder.test.ts. qrDecodeResize.test.ts covers the
// pure cap arithmetic directly.
class FakeCtx {
  drawImage = vi.fn();
  filter = "none";
  translate = vi.fn();
  rotate = vi.fn();
  getImageData(_x: number, _y: number, w: number, h: number): ImageData {
    return { width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)), colorSpace: "srgb" } as ImageData;
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

function stubBitmap(width: number, height: number) {
  const createImageBitmap = vi.fn(async (_source: unknown, options?: { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }) => {
    if (!options) return { width, height, close: vi.fn() };
    const resizedHeight = options.resizeHeight ?? Math.round(height * ((options.resizeWidth ?? width) / width));
    const resizedWidth = Math.round(width * (resizedHeight / height));
    return { width: resizedWidth, height: resizedHeight, close: vi.fn() };
  });
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
  return createImageBitmap;
}

async function collect(bytes: Uint8Array) {
  const out: Array<{ label: string; width: number; height: number }> = [];
  for await (const v of browserImageVariants(bytes)) out.push({ label: v.label, width: v.imageData.width, height: v.imageData.height });
  return out;
}

describe("browserImageVariants with a faked browser image pipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    createdCanvases = [];
  });

  it("passes a resize hint, single-axis only, for a large (real-photo-sized) source", async () => {
    const createImageBitmap = stubBitmap(3072, 4096); // real on-device sample
    await collect(new Uint8Array(4_732_739));

    expect(createImageBitmap).toHaveBeenCalledTimes(1);
    const [, options] = createImageBitmap.mock.calls[0] as [unknown, { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }];
    expect(options.resizeHeight).toBe(MAX_QR_DECODE_LONG_EDGE);
    expect(options.resizeWidth).toBeUndefined();
    expect(options.resizeQuality).toBeDefined();
  });

  it("skips the resize hint for a small source, never upscaling", async () => {
    const createImageBitmap = stubBitmap(400, 300);
    await collect(new Uint8Array(50_000));

    const [, options] = createImageBitmap.mock.calls[0] as [unknown, undefined];
    expect(options).toBeUndefined();
  });

  it("corrects a landscape source (width still over cap after the height-only resize) before generating variants", async () => {
    // 4096x3072: resizeHeight=1600 alone leaves width at ~2133, over the cap.
    stubBitmap(4096, 3072);
    const variants = await collect(new Uint8Array(4_732_739));

    // 3 rotations + brighten + contrast + upscale(2x) = 6 variants, same
    // count/order as before this change -- untouched by this task.
    expect(variants.map((v) => v.label)).toEqual(["rotate-90", "rotate-180", "rotate-270", "brighten", "contrast", "upscale"]);

    // Non-rotated, non-upscaled variants (brighten/contrast) reflect the
    // corrected base size directly, and must never exceed the cap.
    const brighten = variants.find((v) => v.label === "brighten")!;
    expect(Math.max(brighten.width, brighten.height)).toBeLessThanOrEqual(MAX_QR_DECODE_LONG_EDGE);
    expect(brighten.width / brighten.height).toBeCloseTo(4096 / 3072, 2); // aspect preserved
  });

  it("still yields nothing off-browser (no createImageBitmap/OffscreenCanvas)", async () => {
    const variants = await collect(new Uint8Array([1, 2, 3]));
    expect(variants).toEqual([]);
  });
});
