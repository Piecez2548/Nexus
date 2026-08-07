import { describe, expect, it } from "vitest";

import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

import type { QrDecoder } from "./qrDecoder";
import { createQrDetector } from "./qrDetector";
import { createQrScanProcessor } from "./qrScanProcessor";

const fakeDetector = (payload: string | null) =>
  createQrDetector({
    async decode(): Promise<string | null> {
      return payload;
    },
  } satisfies QrDecoder);

const asset: GalleryAssetRef = { assetId: "a1" };

describe("createQrScanProcessor", () => {
  it("hands the raw payload to the callback when a QR is detected", async () => {
    const seen: Array<{ assetId: string; payload: string }> = [];
    const processor = createQrScanProcessor(
      (a, payload) => void seen.push({ assetId: a.assetId, payload }),
      fakeDetector("00020101021129PAYLOAD"),
    );

    await processor.process(asset, new Uint8Array([1]), "hash", 1);

    expect(seen).toEqual([{ assetId: "a1", payload: "00020101021129PAYLOAD" }]);
  });

  it("ignores images with no QR (callback never fires)", async () => {
    let calls = 0;
    const processor = createQrScanProcessor(() => void calls++, fakeDetector(null));

    await processor.process(asset, new Uint8Array([1]), "hash", 1);

    expect(calls).toBe(0);
  });

  it("awaits an async callback before resolving", async () => {
    const order: string[] = [];
    const processor = createQrScanProcessor(async () => {
      await Promise.resolve();
      order.push("callback");
    }, fakeDetector("x"));

    await processor.process(asset, new Uint8Array([1]), "hash", 1);
    order.push("after");

    expect(order).toEqual(["callback", "after"]);
  });
});
