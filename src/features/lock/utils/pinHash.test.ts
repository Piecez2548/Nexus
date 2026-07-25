import { describe, expect, it } from "vitest";
import { hashPin, generateSalt } from "./pinHash";

describe("hashPin", () => {
  it("produces a deterministic hash for the same pin and salt", async () => {
    const a = await hashPin("1234", "fixed-salt");
    const b = await hashPin("1234", "fixed-salt");
    expect(a).toBe(b);
  });

  it("produces a different hash for a different pin", async () => {
    const a = await hashPin("1234", "fixed-salt");
    const b = await hashPin("4321", "fixed-salt");
    expect(a).not.toBe(b);
  });

  it("produces a different hash for a different salt", async () => {
    const a = await hashPin("1234", "salt-a");
    const b = await hashPin("1234", "salt-b");
    expect(a).not.toBe(b);
  });

  it("returns a 64-character hex string (SHA-256)", async () => {
    const hash = await hashPin("1234", "fixed-salt");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("generateSalt", () => {
  it("returns a 32-character hex string", () => {
    expect(generateSalt()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns a different value each call", () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});
