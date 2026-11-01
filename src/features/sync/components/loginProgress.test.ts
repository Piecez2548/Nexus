import { describe, expect, it } from "vitest";
import { passwordScore, signInProgress, signUpProgress } from "./loginProgress";

describe("loginProgress", () => {
  it("fills the sign-in ring half for a valid email and half for a 6+ character password", () => {
    expect(signInProgress("", "")).toBe(0);
    expect(signInProgress("a@b.com", "")).toBe(0.5);
    expect(signInProgress("nope", "123456")).toBe(0.5);
    expect(signInProgress("a@b.com", "12345")).toBe(0.5);
    expect(signInProgress("a@b.com", "123456")).toBe(1);
  });

  it("fills the sign-up ring by name, email and an 8+ character password", () => {
    expect(signUpProgress("Ada", "", "", "")).toBe(0);
    expect(signUpProgress("Ada", "Lovelace", "", "")).toBe(0.25);
    expect(signUpProgress("Ada", "Lovelace", "a@b.com", "")).toBe(0.5);
    expect(signUpProgress("Ada", "Lovelace", "a@b.com", "1234567")).toBe(0.5);
    expect(signUpProgress("Ada", "Lovelace", "a@b.com", "12345678")).toBe(1);
    expect(signUpProgress(" ", "Lovelace", "a@b.com", "12345678")).toBe(0.75);
  });

  it("scores passwords from 0 to 4", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("abc")).toBe(1);
    expect(passwordScore("abcdefgh")).toBe(1);
    expect(passwordScore("Abcdefgh")).toBe(2);
    expect(passwordScore("Abcdefg1")).toBe(3);
    expect(passwordScore("Abcdef1!")).toBe(4);
  });
});
