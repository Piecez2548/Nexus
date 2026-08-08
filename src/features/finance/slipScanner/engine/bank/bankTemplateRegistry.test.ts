import { afterEach, describe, expect, it } from "vitest";

import {
  getAllBankTemplates,
  getBankTemplate,
  registerBankTemplate,
  resetBankTemplates,
} from "./bankTemplateRegistry";

afterEach(() => resetBankTemplates());

describe("bankTemplateRegistry", () => {
  it("seeds templates for the listed banks with colors, logo placeholder and a parser", () => {
    const scb = getBankTemplate("scb");
    expect(scb?.colors.primary).toBe("#4e2e7f");
    expect(scb?.logoText).toBe("SCB");
    expect(scb?.parserId).toBe("emvco-ocr");
    expect(scb?.ocrLabels.amount).toContain("จำนวน");
    expect(getAllBankTemplates().length).toBeGreaterThanOrEqual(10);
  });

  it("returns null for an unknown bank", () => {
    expect(getBankTemplate("nope")).toBeNull();
  });

  it("registers a new bank template without touching existing ones", () => {
    registerBankTemplate({ bankId: "cimb", shortName: "CIMB", colors: { primary: "#7a0019", onPrimary: "#fff" } });
    const cimb = getBankTemplate("cimb");
    expect(cimb?.colors.primary).toBe("#7a0019");
    expect(cimb?.parserId).toBe("emvco-ocr"); // falls back to the shared default
    expect(cimb?.ocrLabels.reference).toContain("reference");
    expect(getBankTemplate("scb")).not.toBeNull();
  });

  it("replaces a template by bankId rather than duplicating", () => {
    const before = getAllBankTemplates().length;
    registerBankTemplate({ bankId: "scb", shortName: "SCBX" });
    expect(getAllBankTemplates().length).toBe(before);
    expect(getBankTemplate("scb")?.shortName).toBe("SCBX");
  });
});
