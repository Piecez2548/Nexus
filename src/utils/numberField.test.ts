import { describe, expect, it } from "vitest";
import { numberOrUndefined } from "./numberField";

describe("numberOrUndefined", () => {
  it("returns undefined for an empty string", () => {
    expect(numberOrUndefined("")).toBeUndefined();
  });

  it("parses a numeric string", () => {
    expect(numberOrUndefined("42")).toBe(42);
    expect(numberOrUndefined("-3.5")).toBe(-3.5);
  });

  it("parses zero as zero, not undefined", () => {
    expect(numberOrUndefined("0")).toBe(0);
  });
});
