import { describe, expect, it } from "vitest";

import { sha256Hex } from "./contentHash";

describe("sha256Hex", () => {
  it("matches the known SHA-256 vector for 'abc'", async () => {
    const bytes = new TextEncoder().encode("abc");
    expect(await sha256Hex(bytes)).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is stable for identical bytes and differs otherwise", async () => {
    const a = await sha256Hex(new Uint8Array([1, 2, 3]));
    const again = await sha256Hex(new Uint8Array([1, 2, 3]));
    const other = await sha256Hex(new Uint8Array([1, 2, 4]));
    expect(a).toBe(again);
    expect(a).not.toBe(other);
  });
});
