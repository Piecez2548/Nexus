import { describe, expect, it } from "vitest";

import { editDistance, isOwnAccountTransfer } from "./ownTransfer";

describe("editDistance", () => {
  it.each([
    ["", "", 0],
    ["abc", "abc", 0],
    ["abc", "abd", 1],
    ["abc", "ab", 1],
    ["kitten", "sitting", 3],
  ])("%s → %s is %i", (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected);
  });
});

describe("isOwnAccountTransfer", () => {
  it("matches the K PLUS shortened payer to the full payee name", () => {
    expect(isOwnAccountTransfer("นาย สมชาย ใ", "นาย สมชาย ใจดี")).toBe(true);
  });

  it("tolerates one misread character in the first name", () => {
    // OCR read the vowel ั as ู in the payee's first name.
    expect(isOwnAccountTransfer("นาย สมพัทธ์ ใ", "นาย สมพูทธ์ ยใจดี")).toBe(true);
  });

  it("does not match a different person", () => {
    expect(isOwnAccountTransfer("นาย สมชาย ใ", "นาย มานะ ใจดี")).toBe(false);
  });

  it("does not match a shop", () => {
    expect(isOwnAccountTransfer("นาย สมชาย ใ", "ร้านอาหารตามสั่ง/ชาบู")).toBe(false);
    expect(isOwnAccountTransfer("Mr John S", "Fried Chicken Shop")).toBe(false);
  });

  it("needs both names", () => {
    expect(isOwnAccountTransfer(undefined, "นาย สมชาย ใจดี")).toBe(false);
    expect(isOwnAccountTransfer("นาย สมชาย ใ", undefined)).toBe(false);
  });

  it("does not stretch the tolerance for short names", () => {
    expect(isOwnAccountTransfer("Mr Tom S", "Mr Tim Smith")).toBe(false);
  });
});
