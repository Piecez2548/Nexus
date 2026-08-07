import { describe, expect, it, vi } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { revokeThumbnails, secureDiscardCandidates, wipeBytes } from "./secureDeletion";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 80,
  ...over,
});

describe("wipeBytes", () => {
  it("zero-fills the buffer in place", () => {
    const bytes = new Uint8Array([1, 2, 3, 255]);
    expect(wipeBytes(bytes)).toBe(bytes);
    expect([...bytes]).toEqual([0, 0, 0, 0]);
  });
});

describe("revokeThumbnails", () => {
  it("revokes each candidate's object URL and counts them", () => {
    const revoke = vi.fn();
    const list = [
      candidate({ id: "1", thumbnailUrl: "blob:a" }),
      candidate({ id: "2" }), // no thumbnail
      candidate({ id: "3", thumbnailUrl: "blob:c" }),
    ];
    expect(revokeThumbnails(list, revoke)).toBe(2);
    expect(revoke).toHaveBeenCalledWith("blob:a");
    expect(revoke).toHaveBeenCalledWith("blob:c");
    expect(revoke).toHaveBeenCalledTimes(2);
  });
});

describe("secureDiscardCandidates", () => {
  it("releases thumbnails for the whole set", () => {
    const revoke = vi.fn();
    expect(secureDiscardCandidates([candidate({ thumbnailUrl: "blob:x" })], revoke)).toBe(1);
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
