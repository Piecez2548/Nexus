import { describe, expect, it } from "vitest";

import { crc16ccitt } from "./emvcoTlv";
import { parseEmvcoPayload } from "./emvcoPayloadParser";

// Append a valid CRC-16/CCITT-FALSE field to a payload body (body must NOT
// already include the CRC). Mirrors how EMVCo computes tag 63.
function withCrc(bodyWithoutCrc: string): string {
  const marked = bodyWithoutCrc + "6304";
  const crc = crc16ccitt(marked).toString(16).toUpperCase().padStart(4, "0");
  return marked + crc;
}

// A realistic static PromptPay (mobile-proxy) QR: format 01, static, merchant
// account tag 29 (AID A000000677010111 + mobile 0066812345678), amount 100.00
// THB, merchant "TEST SHOP" / "BANGKOK", reference label "REF12345".
const PROMPTPAY_BODY =
  "000201" +
  "010211" +
  "29370016A00000067701011101130066812345678" +
  "5303764" +
  "5406100.00" +
  "5802TH" +
  "5909TEST SHOP" +
  "6007BANGKOK" +
  "62120508REF12345";

describe("parseEmvcoPayload", () => {
  it("returns null for a non-EMVCo string", () => {
    expect(parseEmvcoPayload("https://example.com/pay")).toBeNull();
  });

  it("extracts the standard EMVCo fields from a PromptPay payload", () => {
    const payload = parseEmvcoPayload(withCrc(PROMPTPAY_BODY));
    expect(payload).not.toBeNull();

    expect(payload!.crcValid).toBe(true);
    expect(payload!.payloadFormat).toBe("01");
    expect(payload!.initiationMethod).toBe("static");
    expect(payload!.amount).toBe(100);
    expect(payload!.currencyNumeric).toBe("764");
    expect(payload!.currency).toBe("THB");
    expect(payload!.countryCode).toBe("TH");
    expect(payload!.merchantName).toBe("TEST SHOP");
    expect(payload!.merchantCity).toBe("BANGKOK");
  });

  it("identifies the PromptPay proxy (mobile number)", () => {
    const payload = parseEmvcoPayload(withCrc(PROMPTPAY_BODY))!;
    expect(payload.promptPay).toEqual({
      aid: "A000000677010111",
      proxyType: "msisdn",
      proxyValue: "0066812345678",
    });
  });

  it("collects reference IDs from the additional-data template", () => {
    const payload = parseEmvcoPayload(withCrc(PROMPTPAY_BODY))!;
    expect(payload.additionalData?.referenceLabel).toBe("REF12345");
    expect(payload.referenceIds).toContain("REF12345");
  });

  it("exposes the raw merchant-account templates for bank identification (GS-011)", () => {
    const payload = parseEmvcoPayload(withCrc(PROMPTPAY_BODY))!;
    expect(payload.merchantAccounts).toHaveLength(1);
    expect(payload.merchantAccounts[0]!.tag).toBe("29");
  });

  it("still parses a structurally-valid payload but flags a bad checksum", () => {
    const corrupted = PROMPTPAY_BODY + "63040000";
    const payload = parseEmvcoPayload(corrupted);
    expect(payload).not.toBeNull();
    expect(payload!.crcValid).toBe(false);
    expect(payload!.amount).toBe(100);
  });

  it("does not fabricate an amount when the payload omits it", () => {
    const body = "000201" + "010211" + "5303764" + "5802TH";
    const payload = parseEmvcoPayload(withCrc(body))!;
    expect(payload.amount).toBeUndefined();
  });
});
