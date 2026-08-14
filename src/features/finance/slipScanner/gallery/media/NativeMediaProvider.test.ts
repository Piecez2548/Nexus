import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GalleryMediaAsset } from "./nativeGalleryMediaPlugin";

const count = vi.fn();
const page = vi.fn();
const readBytes = vi.fn();

vi.mock("./nativeGalleryMediaPlugin", () => ({
  NativeGalleryMedia: {
    count: (...args: unknown[]) => count(...args),
    page: (...args: unknown[]) => page(...args),
    readBytes: (...args: unknown[]) => readBytes(...args),
  },
}));

const { NativeMediaProvider, PAGE_SIZE } = await import("./NativeMediaProvider");

const asset = (id: string, capturedAt: string): GalleryMediaAsset => ({
  assetId: id,
  capturedAt,
  bytes: 1024,
  filename: `${id}.jpg`,
});

beforeEach(() => {
  count.mockReset();
  page.mockReset();
  readBytes.mockReset();
});

describe("NativeMediaProvider", () => {
  it("counts through the native plugin, converting an ISO cursor to epoch ms", async () => {
    count.mockResolvedValue({ total: 42 });
    const provider = new NativeMediaProvider();

    const total = await provider.count("2026-01-01T00:00:00.000Z");

    expect(total).toBe(42);
    expect(count).toHaveBeenCalledWith({ sinceCursorMs: Date.parse("2026-01-01T00:00:00.000Z") });
  });

  it("counts with no cursor when none is given", async () => {
    count.mockResolvedValue({ total: 10 });
    const provider = new NativeMediaProvider();

    await provider.count();

    expect(count).toHaveBeenCalledWith({ sinceCursorMs: undefined });
  });

  it("paginates through multiple pages until a short page ends enumeration", async () => {
    // A first page exactly PAGE_SIZE long is the only signal that a second
    // page might exist -- anything shorter means "that was everything".
    const fullPage = Array.from({ length: PAGE_SIZE }, (_, i) => asset(String(i + 1), "2026-01-01T00:00:00.000Z"));
    page
      .mockResolvedValueOnce({ assets: fullPage })
      .mockResolvedValueOnce({ assets: [asset("last", "2026-01-03T00:00:00.000Z")] });

    const provider = new NativeMediaProvider();
    const seen: string[] = [];
    for await (const a of provider.enumerate()) seen.push(a.assetId);

    expect(seen).toHaveLength(PAGE_SIZE + 1);
    expect(seen[seen.length - 1]).toBe("last");
    // First page requested at offset 0; the second (short) page fetched at
    // the offset advanced by the first page's full length.
    expect(page).toHaveBeenNthCalledWith(1, { sinceCursorMs: undefined, offset: 0, limit: PAGE_SIZE });
    expect(page).toHaveBeenNthCalledWith(2, { sinceCursorMs: undefined, offset: PAGE_SIZE, limit: PAGE_SIZE });
    expect(page).toHaveBeenCalledTimes(2);
  });

  it("stops immediately on an empty first page", async () => {
    page.mockResolvedValueOnce({ assets: [] });
    const provider = new NativeMediaProvider();

    const seen: string[] = [];
    for await (const a of provider.enumerate()) seen.push(a.assetId);

    expect(seen).toEqual([]);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it("passes the converted cursor through to page()", async () => {
    page.mockResolvedValueOnce({ assets: [] });
    const provider = new NativeMediaProvider();

    for await (const _a of provider.enumerate("2026-02-01T00:00:00.000Z")) {
      // drain
    }

    expect(page).toHaveBeenCalledWith({
      sinceCursorMs: Date.parse("2026-02-01T00:00:00.000Z"),
      offset: 0,
      limit: PAGE_SIZE,
    });
  });

  it("decodes readBytes' base64 response into raw bytes", async () => {
    // "hi" -> base64 "aGk="
    readBytes.mockResolvedValue({ data: "aGk=" });
    const provider = new NativeMediaProvider();

    const bytes = await provider.readBytes({ assetId: "1" });

    expect(readBytes).toHaveBeenCalledWith({ assetId: "1" });
    expect(new TextDecoder().decode(bytes)).toBe("hi");
  });
});
