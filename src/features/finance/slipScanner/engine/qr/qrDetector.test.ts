import { describe, expect, it } from "vitest";

import type { QrDecoder } from "./qrDecoder";
import { createQrDetector } from "./qrDetector";

const fakeDecoder = (payload: string | null): QrDecoder => ({
  async decode(): Promise<string | null> {
    return payload;
  },
});

describe("createQrDetector", () => {
  it("reports a QR and its raw payload when the decoder finds one", async () => {
    const detector = createQrDetector(fakeDecoder("00020101021129..."));
    expect(await detector.detect(new Uint8Array([1]))).toEqual({
      hasQr: true,
      payload: "00020101021129...",
    });
  });

  it("reports no QR when the decoder returns null", async () => {
    const detector = createQrDetector(fakeDecoder(null));
    expect(await detector.detect(new Uint8Array([1]))).toEqual({ hasQr: false, payload: null });
  });

  it("passes the payload through verbatim without parsing it", async () => {
    const raw = "not-a-valid-emvco-string just raw text";
    const detector = createQrDetector(fakeDecoder(raw));
    const result = await detector.detect(new Uint8Array([1]));
    expect(result.payload).toBe(raw);
  });
});
