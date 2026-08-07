import { describe, expect, it } from "vitest";

import { crc16ccitt, findTag, isCrcValid, parseTlv } from "./emvcoTlv";

describe("parseTlv", () => {
  it("parses a flat TLV sequence", () => {
    // 00 len02 "01", 53 len03 "764"
    const nodes = parseTlv("00020153037645");
    // trailing "5" is a stray char -> malformed
    expect(nodes).toBeNull();
  });

  it("parses well-formed flat fields", () => {
    const nodes = parseTlv("0002015303764");
    expect(nodes).toEqual([
      { tag: "00", value: "01" },
      { tag: "53", value: "764" },
    ]);
  });

  it("recursively parses a template tag into children", () => {
    // 29 (merchant account) length 20, value = 00 len16 "A000000677010111"
    const nodes = parseTlv("29200016A000000677010111");
    expect(nodes).not.toBeNull();
    const account = findTag(nodes!, "29");
    expect(account?.children).toEqual([{ tag: "00", value: "A000000677010111" }]);
  });

  it("keeps a template's raw value when its content is not nested TLV", () => {
    // Tag 02 (a merchant-account template) whose value is a non-TLV GUID.
    const nodes = parseTlv("0204ABCD");
    expect(nodes).toEqual([{ tag: "02", value: "ABCD" }]);
  });

  it("returns null for a non-TLV string (e.g. a URL)", () => {
    expect(parseTlv("https://example.com/pay")).toBeNull();
  });

  it("returns null when a declared length overruns the input", () => {
    expect(parseTlv("0099AB")).toBeNull();
  });
});

describe("crc16ccitt", () => {
  it("matches the canonical CRC-16/CCITT-FALSE check value", () => {
    expect(crc16ccitt("123456789")).toBe(0x29b1);
  });
});

describe("isCrcValid", () => {
  it("accepts a payload whose trailing CRC matches", () => {
    const body = "000201" + "6304";
    const crc = crc16ccitt(body).toString(16).toUpperCase().padStart(4, "0");
    expect(isCrcValid(body + crc)).toBe(true);
  });

  it("rejects a payload with a wrong CRC", () => {
    expect(isCrcValid("00020163040000")).toBe(false);
  });

  it("rejects a payload without the 6304 CRC marker", () => {
    expect(isCrcValid("0002015303764")).toBe(false);
  });
});
