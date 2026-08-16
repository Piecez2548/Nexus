import { describe, expect, it } from "vitest";

import { capLongEdge, MAX_QR_DECODE_LONG_EDGE, shouldResizeOnDecode } from "./qrDecodeResize";

describe("shouldResizeOnDecode", () => {
  it("skips the resize hint below the byte floor (guards against upscaling a small source)", () => {
    expect(shouldResizeOnDecode(0)).toBe(false);
    expect(shouldResizeOnDecode(149_999)).toBe(false);
  });

  it("applies the resize hint at and above the byte floor", () => {
    expect(shouldResizeOnDecode(150_000)).toBe(true);
    expect(shouldResizeOnDecode(4_732_739)).toBe(true); // a real gallery-photo size observed on-device
  });
});

describe("capLongEdge", () => {
  it("never upscales an image already within the cap", () => {
    expect(capLongEdge(800, 600)).toEqual({ width: 800, height: 600 });
    expect(capLongEdge(1600, 900)).toEqual({ width: 1600, height: 900 }); // exactly at the cap
  });

  it("caps a portrait image's long edge (height) while preserving aspect ratio", () => {
    // Real on-device sample: 3072x4096.
    const result = capLongEdge(3072, 4096);
    expect(result.height).toBe(1600);
    expect(result.width).toBe(Math.round(3072 * (1600 / 4096)));
    expect(result.width / result.height).toBeCloseTo(3072 / 4096, 3);
  });

  it("caps a landscape image's long edge (width) while preserving aspect ratio", () => {
    const result = capLongEdge(4096, 3072);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(Math.round(3072 * (1600 / 4096)));
    expect(result.width / result.height).toBeCloseTo(4096 / 3072, 3);
  });

  it("respects a custom cap", () => {
    expect(capLongEdge(2000, 1000, 500)).toEqual({ width: 500, height: 250 });
  });

  it("never produces a zero dimension for an extreme aspect ratio", () => {
    const result = capLongEdge(20000, 10, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("default cap matches MAX_QR_DECODE_LONG_EDGE", () => {
    const result = capLongEdge(4000, 2000);
    expect(Math.max(result.width, result.height)).toBe(MAX_QR_DECODE_LONG_EDGE);
  });
});
