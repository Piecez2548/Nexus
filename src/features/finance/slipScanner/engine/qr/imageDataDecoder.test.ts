import { describe, expect, it } from "vitest";

import { imageDataQrDecoder } from "./imageDataDecoder";

// jsdom has no image-decoding pipeline (createImageBitmap / OffscreenCanvas),
// so the decoder degrades to null here rather than throwing. Real decoding is
// exercised on-device / in a browser, not in this unit env — this test just
// pins the graceful-degradation contract the scanner relies on.
describe("imageDataQrDecoder", () => {
  it("returns null when no browser image pipeline is available", async () => {
    expect(await imageDataQrDecoder.decode(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
