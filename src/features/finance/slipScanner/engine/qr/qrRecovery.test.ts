import { describe, expect, it } from "vitest";

import type { QrDecoder } from "./qrDecoder";
import { browserImageVariants, type ImageVariant, type ImageVariantGenerator } from "./imageVariants";
import { recoverQr } from "./qrRecovery";

// Variant generator yielding labelled fakes.
const fakeVariants = (labels: string[]): ImageVariantGenerator =>
  async function* () {
    for (const label of labels) yield { label, bytes: new Uint8Array([label.length]) } satisfies ImageVariant;
  };

// Decoder that returns a payload only for bytes whose first value matches.
const decoderFor = (successLen: number | null): QrDecoder => ({
  async decode(bytes) {
    return successLen !== null && bytes[0] === successLen ? "PAYLOAD" : null;
  },
});

describe("recoverQr", () => {
  it("returns immediately when the original decodes", async () => {
    const result = await recoverQr(new Uint8Array([9]), { decoder: decoderFor(9), variants: fakeVariants(["rotate-90"]) });
    expect(result).toEqual({ payload: "PAYLOAD", recoveredBy: "original", attempts: 1 });
  });

  it("recovers via a variant when the original fails", async () => {
    // "contrast".length === 8 → the decoder succeeds on that variant's bytes.
    const result = await recoverQr(new Uint8Array([0]), {
      decoder: decoderFor(8),
      variants: fakeVariants(["rotate-90", "contrast", "upscale"]),
    });
    expect(result.payload).toBe("PAYLOAD");
    expect(result.recoveredBy).toBe("contrast");
    expect(result.attempts).toBe(3); // original + rotate-90 + contrast
  });

  it("gives up after exhausting variants", async () => {
    const result = await recoverQr(new Uint8Array([0]), {
      decoder: decoderFor(null),
      variants: fakeVariants(["rotate-90", "rotate-180"]),
    });
    expect(result).toEqual({ payload: null, recoveredBy: null, attempts: 3 });
  });

  it("respects maxAttempts", async () => {
    const result = await recoverQr(new Uint8Array([0]), {
      decoder: decoderFor(99),
      variants: fakeVariants(["a", "b", "c", "d"]),
      maxAttempts: 2,
    });
    expect(result.payload).toBeNull();
    expect(result.attempts).toBe(2); // original + 1 variant, then stop
  });

  it("stops trying further variants once isCancelled becomes true, instead of exhausting all of them", async () => {
    let checks = 0;
    const result = await recoverQr(new Uint8Array([0]), {
      decoder: decoderFor(null), // never finds a QR -- would otherwise exhaust every variant
      variants: fakeVariants(["rotate-90", "rotate-180", "rotate-270", "brighten", "contrast", "upscale"]),
      isCancelled: () => {
        checks += 1;
        return checks > 1; // let the first variant through, cancel before the second
      },
    });

    expect(result.payload).toBeNull();
    // original (1) + exactly 1 variant tried before cancellation stopped it --
    // not all 6 remaining variants.
    expect(result.attempts).toBe(2);
  });

  it("never attempts a variant when already cancelled (skipOriginal too)", async () => {
    const result = await recoverQr(new Uint8Array([0]), {
      decoder: decoderFor(null),
      variants: fakeVariants(["rotate-90", "rotate-180"]),
      skipOriginal: true,
      isCancelled: () => true,
    });

    expect(result).toEqual({ payload: null, recoveredBy: null, attempts: 0 });
  });
});

describe("browserImageVariants", () => {
  it("yields nothing off-browser (no canvas)", async () => {
    const collected: ImageVariant[] = [];
    for await (const v of browserImageVariants(new Uint8Array([1, 2, 3]))) collected.push(v);
    expect(collected).toEqual([]);
  });
});
