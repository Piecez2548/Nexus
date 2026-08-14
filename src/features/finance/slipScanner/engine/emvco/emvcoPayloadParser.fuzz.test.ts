import { describe, expect, it } from "vitest";

import { extractOcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";

import { parseTlv } from "./emvcoTlv";
import { parseEmvcoPayload } from "./emvcoPayloadParser";

// Property-based robustness for the two parsers that run on untrusted,
// error-prone input straight from image decoding: a QR payload (garbled by a
// bad scan, or an arbitrary non-slip QR someone points the scanner at) and
// OCR text (garbled by the recognizer). Neither may ever throw, no matter
// how malformed the input -- a corrupted photo should degrade to "no slip
// found", never crash the scan. No fuzzing library; a tiny seeded PRNG keeps
// a failure reproducible (the seed is logged) instead of flaking in CI.

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ASCII_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,:;#-_/\\\n\t";

function randomString(rand: () => number, maxLen: number): string {
  const len = Math.floor(rand() * maxLen);
  let s = "";
  for (let i = 0; i < len; i++) {
    // Occasionally inject a non-ASCII / multibyte code point, matching real
    // OCR output (Thai text) and possible mis-decoded QR bytes.
    if (rand() < 0.1) {
      s += String.fromCodePoint(Math.floor(rand() * 0xffff) + 1);
    } else {
      s += ASCII_CHARS[Math.floor(rand() * ASCII_CHARS.length)];
    }
  }
  return s;
}

// TLV-shaped but corrupted: valid-looking "TTLL" prefixes with a random
// chance of a truncated or mismatched value length -- the trickiest case for
// parseTlv's bounds checking, more likely to hit an edge the pure-random
// generator above rarely reaches.
function randomTlvLikeString(rand: () => number, fields: number): string {
  let s = "";
  for (let i = 0; i < fields; i++) {
    const tag = String(Math.floor(rand() * 100)).padStart(2, "0");
    const declaredLen = Math.floor(rand() * 30);
    const actualLen = rand() < 0.3 ? Math.max(0, declaredLen + Math.floor(rand() * 10) - 5) : declaredLen;
    s += tag + String(declaredLen).padStart(2, "0") + randomString(rand, actualLen + 1).slice(0, actualLen);
  }
  return s;
}

const SEED = 424242;
const ITERATIONS = 2000;

describe("EMVCo/OCR parser fuzzing", () => {
  it("parseTlv never throws on arbitrary strings", () => {
    const rand = mulberry32(SEED);
    for (let i = 0; i < ITERATIONS; i++) {
      const input = i % 2 === 0 ? randomString(rand, 300) : randomTlvLikeString(rand, 10);
      expect(() => parseTlv(input), `seed=${SEED} i=${i} input=${JSON.stringify(input)}`).not.toThrow();
    }
  });

  it("parseEmvcoPayload never throws and returns a well-shaped result on arbitrary strings", () => {
    const rand = mulberry32(SEED + 1);
    for (let i = 0; i < ITERATIONS; i++) {
      const input = i % 2 === 0 ? randomString(rand, 300) : randomTlvLikeString(rand, 10);
      let threw = false;
      let result: ReturnType<typeof parseEmvcoPayload> = null;
      try {
        result = parseEmvcoPayload(input);
      } catch {
        threw = true;
      }
      expect(threw, `seed=${SEED + 1} i=${i} input=${JSON.stringify(input)}`).toBe(false);

      if (result !== null) {
        expect(result.raw).toBe(input);
        expect(typeof result.crcValid).toBe("boolean");
        expect(Array.isArray(result.merchantAccounts)).toBe(true);
        expect(Array.isArray(result.referenceIds)).toBe(true);
      }
    }
  });

  it("parseEmvcoPayload never throws on very long or empty input", () => {
    expect(() => parseEmvcoPayload("")).not.toThrow();
    expect(parseEmvcoPayload("")).toBeNull();

    const rand = mulberry32(SEED + 2);
    expect(() => parseEmvcoPayload(randomString(rand, 8000))).not.toThrow();
    expect(() => parseEmvcoPayload(randomTlvLikeString(rand, 500))).not.toThrow();
  });

  it("extractOcrSlipFields never throws on arbitrary OCR-shaped text", () => {
    const rand = mulberry32(SEED + 3);
    for (let i = 0; i < ITERATIONS; i++) {
      const input = randomString(rand, 500);
      let threw = false;
      let result: ReturnType<typeof extractOcrSlipFields> = {};
      try {
        result = extractOcrSlipFields(input);
      } catch {
        threw = true;
      }
      expect(threw, `seed=${SEED + 3} i=${i} input=${JSON.stringify(input)}`).toBe(false);
      expect(typeof result).toBe("object");
    }
  });
});
