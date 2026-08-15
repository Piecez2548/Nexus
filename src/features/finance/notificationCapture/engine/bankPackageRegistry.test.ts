import { describe, expect, it } from "vitest";

import { bankIdForPackage } from "./bankPackageRegistry";

describe("bankIdForPackage", () => {
  it("resolves a known Phase-1 bank app package name", () => {
    expect(bankIdForPackage("com.scb.phone")).toBe("scb");
    expect(bankIdForPackage("com.kasikorn.retail.mbanking.wap")).toBe("kbank");
    expect(bankIdForPackage("com.ktb.next")).toBe("ktb");
  });

  it("returns null for an unknown package", () => {
    expect(bankIdForPackage("com.whatsapp")).toBeNull();
  });
});
