import { describe, expect, it } from "vitest";
import { emptyToUndefined } from "./selectField";

describe("emptyToUndefined", () => {
  it("returns undefined for an empty string", () => {
    expect(emptyToUndefined("")).toBeUndefined();
  });

  it("passes through a non-empty value", () => {
    expect(emptyToUndefined("london")).toBe("london");
  });
});
