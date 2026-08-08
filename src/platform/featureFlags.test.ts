import { beforeEach, describe, expect, it } from "vitest";

import { resolveFlag } from "./featureFlags";
import { useFeatureFlagStore } from "./featureFlagStore";

describe("resolveFlag", () => {
  it("uses the default for a known non-experimental flag", () => {
    expect(resolveFlag("galleryScanner", undefined, false)).toBe(true);
    expect(resolveFlag("commandPalette", undefined, false)).toBe(true);
  });

  it("hides experimental flags outside dev but shows them in dev", () => {
    expect(resolveFlag("galleryAutoScan", undefined, false)).toBe(false);
    expect(resolveFlag("galleryAutoScan", undefined, true)).toBe(true);
  });

  it("lets an explicit override win over gating", () => {
    expect(resolveFlag("galleryAutoScan", true, false)).toBe(true);
    expect(resolveFlag("galleryScanner", false, true)).toBe(false);
  });

  it("returns false for an unknown flag", () => {
    expect(resolveFlag("nope", undefined, true)).toBe(false);
  });
});

describe("useFeatureFlagStore", () => {
  beforeEach(() => useFeatureFlagStore.getState().reset());

  it("overrides, then rolls back a single flag and all flags", () => {
    const store = useFeatureFlagStore.getState();
    store.setFlag("galleryAutoScan", true);
    expect(useFeatureFlagStore.getState().isEnabled("galleryAutoScan")).toBe(true);

    store.clearFlag("galleryAutoScan");
    expect(useFeatureFlagStore.getState().overrides["galleryAutoScan"]).toBeUndefined();

    store.setFlag("commandPalette", false);
    store.reset();
    expect(useFeatureFlagStore.getState().overrides).toEqual({});
  });
});
