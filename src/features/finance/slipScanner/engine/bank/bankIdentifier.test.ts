import { afterEach, describe, expect, it } from "vitest";

import { parseEmvcoPayload, type EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { crc16ccitt } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";

import { identifyBank } from "./bankIdentifier";
import { registerBankPlugin, resetBankRegistry } from "./bankRegistry";

afterEach(() => {
  resetBankRegistry();
});

function withCrc(bodyWithoutCrc: string): string {
  const marked = bodyWithoutCrc + "6304";
  const crc = crc16ccitt(marked).toString(16).toUpperCase().padStart(4, "0");
  return marked + crc;
}

const emptyPayload = (over: Partial<EmvcoPayload>): EmvcoPayload => ({
  raw: "",
  crcValid: true,
  merchantAccounts: [],
  referenceIds: [],
  ...over,
});

describe("identifyBank", () => {
  it("identifies the PromptPay rail from a real PromptPay QR", () => {
    const payload = parseEmvcoPayload(
      withCrc("000201010211" + "29370016A00000067701011101130066812345678" + "5303764" + "5802TH"),
    )!;
    const result = identifyBank(payload);
    expect(result?.bank.id).toBe("promptpay");
    expect(result?.matchedBy).toBe("promptPayAid");
  });

  it("returns null when nothing recognises the payload", () => {
    expect(identifyBank(emptyPayload({}))).toBeNull();
  });

  it("matches a registered bank-specific plugin by its account GUID, ahead of the PromptPay rail", () => {
    registerBankPlugin({
      bank: { id: "acme", code: "099", name: "Acme Bank", shortName: "Acme" },
      aidGuids: ["A000000999"],
    });
    const payload = emptyPayload({
      merchantAccounts: [{ tag: "29", value: "", children: [{ tag: "00", value: "A000000999XYZ" }] }],
      promptPay: { aid: "A000000999XYZ" },
    });
    const result = identifyBank(payload);
    expect(result?.bank.id).toBe("acme");
    expect(result?.matchedBy).toBe("aidGuid");
  });

  it("honours a plugin's custom match predicate", () => {
    registerBankPlugin({
      bank: { id: "custom", code: "088", name: "Custom Bank", shortName: "Custom" },
      match: (p) => p.merchantName === "CUSTOM MERCHANT",
    });
    expect(identifyBank(emptyPayload({ merchantName: "CUSTOM MERCHANT" }))?.bank.id).toBe("custom");
    expect(identifyBank(emptyPayload({ merchantName: "OTHER" }))).toBeNull();
  });
});
