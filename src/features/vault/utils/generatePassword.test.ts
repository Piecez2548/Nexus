import { describe, expect, it } from "vitest";
import { generatePassword } from "./generatePassword";

describe("generatePassword", () => {
  it("defaults to a 20-character password using all character classes", () => {
    const password = generatePassword();
    expect(password).toHaveLength(20);
    expect(password).toMatch(/[A-Z]/);
  });

  it("honors a custom length", () => {
    expect(generatePassword({ length: 8 })).toHaveLength(8);
    expect(generatePassword({ length: 32 })).toHaveLength(32);
  });

  it("only draws from the enabled character classes", () => {
    const numbersOnly = generatePassword({ length: 50, uppercase: false, lowercase: false, numbers: true, symbols: false });
    expect(numbersOnly).toMatch(/^[0-9]+$/);

    const lettersOnly = generatePassword({ length: 50, uppercase: true, lowercase: true, numbers: false, symbols: false });
    expect(lettersOnly).toMatch(/^[A-Za-z]+$/);
  });

  it("returns an empty string when every character class is disabled", () => {
    expect(generatePassword({ uppercase: false, lowercase: false, numbers: false, symbols: false })).toBe("");
  });

  it("produces different output across calls (real randomness, not a fixed sequence)", () => {
    const a = generatePassword();
    const b = generatePassword();
    expect(a).not.toBe(b);
  });
});
