import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { ScanProcessor } from "@/features/finance/slipScanner/services/scanProcessor";

import { useGalleryScan } from "./useGalleryScan";

function file(name: string, content: string): File {
  return new File([content], name, { type: "image/jpeg" });
}

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipScanCache.clear();
});

describe("useGalleryScan", () => {
  it("scans picked files with the default no-op processor when none is given", async () => {
    const { result } = renderHook(() => useGalleryScan());

    await act(async () => {
      await result.current.scanPickedFiles([file("a.jpg", "a"), file("b.jpg", "b")], false);
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(result.current.progress).toMatchObject({ done: 2, failed: 0 });
  });

  it("drives a supplied processor for every asset scanned", async () => {
    const processed: string[] = [];
    const processor: ScanProcessor = {
      async process(asset: GalleryAssetRef) {
        processed.push(asset.assetId);
      },
    };

    const { result } = renderHook(() => useGalleryScan());

    await act(async () => {
      await result.current.scanPickedFiles([file("a.jpg", "a"), file("b.jpg", "b")], false, processor);
    });

    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(processed).toHaveLength(2);
  });
});
