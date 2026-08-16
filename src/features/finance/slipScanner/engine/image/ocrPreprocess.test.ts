import { afterEach, describe, expect, it, vi } from "vitest";

import { preprocessForOcr } from "./ocrPreprocess";

// jsdom has no image-decoding pipeline, so preprocessForOcr returns the
// original bytes unchanged rather than throwing.
describe("preprocessForOcr off-browser", () => {
  it("returns the original bytes when no browser image pipeline is available", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(await preprocessForOcr(bytes)).toBe(bytes);
  });
});

// Fakes just enough of the browser image pipeline to verify the *merged*
// enhance+resize+binarise pipeline's call sequence -- specifically, that the
// full-resolution intermediate canvas (filter + optional sharpen) is only
// created when enhancement is actually needed, and that the target (resized)
// canvas always draws from the right source: the intermediate canvas when
// enhancement applied, the bitmap directly when it didn't. This is the
// contract that replaces the old enhanceIfNeeded()-then-re-decode round
// trip; qrDecodeResize.test.ts and imageEnhancer.test.ts cover the pure
// arithmetic and resize-hint pieces this pipeline also depends on.
//
// Pixel fill is configurable per-test: a checkerboard of two mid-range
// values gives real variance (brightness ~125, contrast ~75) so
// planEnhancements() decides nothing needs correcting -- uniform data would
// always read as zero contrast (maximally "needs correcting"), which can't
// exercise the "no enhancement" branch at all.
let fillMode: "healthy" | "dark" = "healthy";

class FakeCtx {
  filter = "none";
  filterAtDrawCalls: string[] = [];
  drawImage = vi.fn((..._args: unknown[]) => {
    this.filterAtDrawCalls.push(this.filter);
  });
  getImageData(_x: number, _y: number, w: number, h: number): ImageData {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < data.length; i += 4) {
      const v = fillMode === "healthy" ? (i / 4) % 2 === 0 ? 50 : 200 : 10;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    return { width: w, height: h, data, colorSpace: "srgb" } as ImageData;
  }
  putImageData = vi.fn();
  createImageData(w: number, h: number): ImageData {
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
  convertToBlob(): Promise<Blob> {
    return Promise.resolve(new Blob([new Uint8Array([9, 9, 9])]));
  }
}

function stubBitmap(width: number, height: number) {
  const createImageBitmap = vi.fn(async (_source: unknown, options?: { resizeWidth?: number; resizeHeight?: number; resizeQuality?: string }) => ({
    width: options?.resizeWidth ?? width,
    height: options?.resizeHeight ?? height,
    close: vi.fn(),
  }));
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
  return createImageBitmap;
}

describe("preprocessForOcr with a faked browser image pipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    createdCanvases = [];
    fillMode = "healthy";
  });

  it("skips the full-resolution intermediate canvas and draws straight from the bitmap when no enhancement is needed", async () => {
    fillMode = "healthy"; // mid-brightness, real contrast -> isEnhancementNeeded() === false
    stubBitmap(300, 400);

    await preprocessForOcr(new Uint8Array(4_732_739));

    // Only the 64x64 analyzeImage sample and the resize-target canvas --
    // no full-resolution (300x400) intermediate canvas was ever created.
    const full = createdCanvases.find((c) => c.width === 300 && c.height === 400);
    expect(full).toBeUndefined();

    const target = createdCanvases.find((c) => c.width !== 64);
    expect(target).toBeDefined();
    const [source] = target!.ctx.drawImage.mock.calls[0] as [unknown];
    // Drew directly from the decoded bitmap (an object with width/height,
    // not one of our FakeOffscreenCanvas instances).
    expect(source).not.toBeInstanceOf(FakeOffscreenCanvas);
  });

  it("creates a full-resolution intermediate canvas, applies the filter, then draws that (not the bitmap) onto the target canvas when enhancement is needed", async () => {
    fillMode = "dark"; // brightness ~10, contrast 0 -> isEnhancementNeeded() === true (and sharpen === true)
    stubBitmap(300, 400); // small on purpose -- this branch runs the real O(w*h*9) sharpen convolution

    await preprocessForOcr(new Uint8Array(4_732_739));

    const full = createdCanvases.find((c) => c.width === 300 && c.height === 400);
    expect(full).toBeDefined();
    // The bitmap->full-canvas draw happened while the brightness/contrast
    // filter was active (the filter is reset to "none" right before sharpen
    // runs, matching the original enhanceIfNeeded order -- so checking the
    // *final* filter value would be wrong; the value at draw time is what
    // matters).
    expect(full!.ctx.filterAtDrawCalls[0]).not.toBe("none");

    const target = createdCanvases.find((c) => c.width !== 300 && c.width !== 64);
    expect(target).toBeDefined();
    // The target canvas's draw call must source from the intermediate
    // (enhanced) canvas, not the raw bitmap -- the whole point of applying
    // enhancement before the resize.
    const [source] = target!.ctx.drawImage.mock.calls[0] as [unknown];
    // `full` here IS the OffscreenCanvas instance -- what preprocessForOcr's
    // own `makeCanvas()` result calls `.canvas` -- not a further wrapper.
    expect(source).toBe(full);
  });

  it("returns a Uint8Array of the encoded result, bounded to the ~1200px target regardless of source size", async () => {
    fillMode = "healthy";
    stubBitmap(3072, 4096); // real on-device aspect ratio; "healthy" fill skips the sharpen convolution entirely

    const result = await preprocessForOcr(new Uint8Array(4_732_739));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);

    const target = createdCanvases.find((c) => c.width !== 3072 && c.width !== 64);
    expect(target).toBeDefined();
    expect(Math.max(target!.width, target!.height)).toBeLessThanOrEqual(1600); // well within the 1200px-short-edge target for this aspect ratio
  });
});
