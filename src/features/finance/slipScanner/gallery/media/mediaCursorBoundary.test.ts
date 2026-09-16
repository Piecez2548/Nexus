import { describe, expect, it } from "vitest";
import { mediaCursorIso, mediaCursorMs } from "./mediaCursorBoundary";

describe("media cursor boundaries", () => {
  it("includes the entire local calendar day for an upper date boundary", () => {
    const start = mediaCursorMs("2026-09-16")!;
    const end = mediaCursorMs("2026-09-16", true)!;
    expect(end - start).toBe(24 * 60 * 60 * 1000);
    expect(mediaCursorIso("2026-09-16", true)).toBe(new Date(end).toISOString());
  });

  it("preserves full timestamp cursors and rejects invalid input", () => {
    expect(mediaCursorMs("2026-09-16T08:30:00.000Z", true)).toBe(Date.parse("2026-09-16T08:30:00.000Z"));
    expect(mediaCursorMs("not-a-date")).toBeUndefined();
  });
});
