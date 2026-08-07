import { afterEach, describe, expect, it } from "vitest";

import { getBankPlugins, identifyBankByCode, registerBankPlugin, resetBankRegistry } from "./bankRegistry";

afterEach(() => {
  resetBankRegistry();
});

describe("identifyBankByCode", () => {
  it("resolves the standard Bank of Thailand codes to the listed banks", () => {
    expect(identifyBankByCode("002")?.shortName).toBe("BBL");
    expect(identifyBankByCode("004")?.shortName).toBe("KBank");
    expect(identifyBankByCode("006")?.shortName).toBe("Krungthai");
    expect(identifyBankByCode("011")?.shortName).toBe("TTB");
    expect(identifyBankByCode("014")?.shortName).toBe("SCB");
    expect(identifyBankByCode("024")?.shortName).toBe("UOB");
    expect(identifyBankByCode("025")?.shortName).toBe("Krungsri");
    expect(identifyBankByCode("030")?.shortName).toBe("GSB");
    expect(identifyBankByCode("034")?.shortName).toBe("BAAC");
  });

  it("returns null for an unknown or empty code", () => {
    expect(identifyBankByCode("999")).toBeNull();
    expect(identifyBankByCode("")).toBeNull();
    expect(identifyBankByCode("   ")).toBeNull();
  });

  it("does not resolve the null-code PromptPay rail by code", () => {
    // PromptPay is a rail (code null); it must not be reachable via code lookup.
    expect(getBankPlugins().some((p) => p.bank.id === "promptpay")).toBe(true);
    expect(identifyBankByCode("")).toBeNull();
  });
});

describe("registerBankPlugin", () => {
  it("adds a new institution that byCode can then resolve", () => {
    registerBankPlugin({ bank: { id: "cimb", code: "022", name: "CIMB Thai Bank", shortName: "CIMB" } });
    expect(identifyBankByCode("022")?.shortName).toBe("CIMB");
  });

  it("replaces an existing plugin by bank id rather than duplicating it", () => {
    const before = getBankPlugins().length;
    registerBankPlugin({ bank: { id: "scb", code: "014", name: "SCB (renamed)", shortName: "SCBX" } });
    expect(getBankPlugins().length).toBe(before);
    expect(identifyBankByCode("014")?.shortName).toBe("SCBX");
  });
});
