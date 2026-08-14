import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";

import { createSlipExtractionProcessor } from "./slipExtractionProcessor";

const asset: GalleryAssetRef = { assetId: "a1" };

const fakeCandidate = (over: Partial<SlipCandidate> = {}): SlipCandidate => ({
  id: "a1",
  assetId: "a1",
  source: "ocr",
  isDuplicate: false,
  confidence: 50,
  ...over,
});

describe("createSlipExtractionProcessor", () => {
  it("extracts a candidate and hands it (with the asset) to the callback", async () => {
    const seen: Array<{ assetId: string; candidate: SlipCandidate }> = [];
    const candidate = fakeCandidate({ amount: 100, merchant: "Test Shop" });
    const processor = createSlipExtractionProcessor(
      (a, c) => void seen.push({ assetId: a.assetId, candidate: c }),
      async () => candidate,
    );

    await processor.process(asset, new Uint8Array([1]), "hash", 1);

    expect(seen).toEqual([{ assetId: "a1", candidate }]);
  });

  it("passes the asset's id and bytes through to the extractor", async () => {
    let received: { assetId: string; bytes: Uint8Array } | null = null;
    const bytes = new Uint8Array([9, 9, 9]);
    const processor = createSlipExtractionProcessor(
      () => {},
      async (input) => {
        received = { assetId: input.assetId, bytes: input.bytes };
        return fakeCandidate();
      },
    );

    await processor.process(asset, bytes, "hash", 1);

    expect(received).toEqual({ assetId: "a1", bytes });
  });

  it("awaits an async callback before resolving", async () => {
    const order: string[] = [];
    const processor = createSlipExtractionProcessor(async () => {
      await Promise.resolve();
      order.push("callback");
    }, async () => fakeCandidate());

    await processor.process(asset, new Uint8Array([1]), "hash", 1);
    order.push("after");

    expect(order).toEqual(["callback", "after"]);
  });

  it("propagates an extraction failure so the scan queue can retry it", async () => {
    const processor = createSlipExtractionProcessor(
      () => {},
      async () => {
        throw new Error("extraction failed");
      },
    );

    await expect(processor.process(asset, new Uint8Array([1]), "hash", 1)).rejects.toThrow("extraction failed");
  });
});
