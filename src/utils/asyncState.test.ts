import { describe, expect, it } from "vitest";
import { toErrorMessage } from "./asyncState";

describe("toErrorMessage", () => {
  it("returns the message of an Error instance", () => {
    expect(toErrorMessage(new Error("Dexie write failed"))).toBe("Dexie write failed");
  });

  it("falls back to a generic message for non-Error throws", () => {
    expect(toErrorMessage("plain string")).toBe("Something went wrong.");
    expect(toErrorMessage(undefined)).toBe("Something went wrong.");
    expect(toErrorMessage({ code: 500 })).toBe("Something went wrong.");
  });
});
