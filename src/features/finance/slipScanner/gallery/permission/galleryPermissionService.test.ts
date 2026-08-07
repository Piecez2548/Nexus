import { describe, expect, it } from "vitest";

import { buildResult, mapPermissionState } from "./galleryPermissionService";

describe("mapPermissionState", () => {
  it("maps native permission strings to the unified status", () => {
    expect(mapPermissionState("granted")).toBe("granted");
    expect(mapPermissionState("limited")).toBe("limited");
    expect(mapPermissionState("denied")).toBe("denied");
    expect(mapPermissionState("prompt")).toBe("prompt");
    expect(mapPermissionState("prompt-with-rationale")).toBe("prompt");
  });
});

describe("buildResult", () => {
  it("allows scanning only when granted or limited", () => {
    expect(buildResult("granted").canScanGallery).toBe(true);
    expect(buildResult("limited").canScanGallery).toBe(true);
    expect(buildResult("prompt").canScanGallery).toBe(false);
    expect(buildResult("denied").canScanGallery).toBe(false);
    expect(buildResult("blocked").canScanGallery).toBe(false);
    expect(buildResult("unavailable").canScanGallery).toBe(false);
  });

  it("allows re-requesting only from a soft state (prompt or denied)", () => {
    expect(buildResult("prompt").canRequestAgain).toBe(true);
    expect(buildResult("denied").canRequestAgain).toBe(true);
    // blocked → recover via Settings; unavailable/granted/limited → nothing to ask
    expect(buildResult("blocked").canRequestAgain).toBe(false);
    expect(buildResult("unavailable").canRequestAgain).toBe(false);
    expect(buildResult("granted").canRequestAgain).toBe(false);
  });
});
