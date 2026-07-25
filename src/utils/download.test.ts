import { describe, expect, it, vi, afterEach } from "vitest";
import { downloadFile } from "./download";

describe("downloadFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function captureBlobBytes(mimeType: string, content: string) {
    let capturedBlob: Blob | null = null;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      capturedBlob = blob as Blob;
      return "blob:mock";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadFile("file.txt", content, mimeType);

    const buffer = await capturedBlob!.arrayBuffer();
    return new Uint8Array(buffer);
  }

  it("prefixes a UTF-8 BOM for CSV exports so Excel doesn't garble non-ASCII text", async () => {
    // The BOM (EF BB BF) is what actually lands on disk — decoding it back
    // through TextDecoder would strip it again (that's the decoder's own
    // spec-correct behavior), so we check the raw bytes instead.
    const bytes = await captureBlobBytes("text/csv;charset=utf-8;", "title,amount\nกาแฟ,120");
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("does not add a BOM for non-CSV exports", async () => {
    const bytes = await captureBlobBytes("application/json", '{"title":"กาแฟ"}');
    expect(Array.from(bytes.slice(0, 3))).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes[0]).toBe("{".charCodeAt(0));
  });
});
