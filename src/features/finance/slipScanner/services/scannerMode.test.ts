import { describe, expect, it } from "vitest";

import { AUTOMATIC_GALLERY_SCAN_MODE, MANUAL_GALLERY_SCAN_MODE } from "./scannerMode";

describe("gallery scan modes", () => {
  it("keeps manual scans exhaustive and non-incremental while automatic scans remain incremental", () => {
    expect(MANUAL_GALLERY_SCAN_MODE).toEqual({ incremental: false, exhaustive: true });
    expect(AUTOMATIC_GALLERY_SCAN_MODE).toEqual({ incremental: true, exhaustive: false });
  });
});
