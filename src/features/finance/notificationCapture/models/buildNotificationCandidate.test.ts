import { describe, expect, it } from "vitest";

import { buildNotificationCandidate } from "./buildNotificationCandidate";

describe("buildNotificationCandidate", () => {
  it("builds a candidate from a recognised bank package with an amount and counterparty", () => {
    const candidate = buildNotificationCandidate({
      id: "abc-123",
      packageName: "com.scb.phone",
      title: "จ่ายเงินสำเร็จ",
      text: "250.00 บาท ไปยัง John Doe",
      bigText: "",
      postedAtMs: 1_700_000_000_000,
    });

    expect(candidate).not.toBeNull();
    expect(candidate?.source).toBe("notification");
    expect(candidate?.bankId).toBe("scb");
    expect(candidate?.bankName).toBe("SCB");
    expect(candidate?.amount).toBe(250);
    expect(candidate?.merchant).toBe("John Doe");
    expect(candidate?.isDuplicate).toBe(false);
    expect(candidate?.id).toBe("notification:abc-123");
  });

  it("prefers bigText over text when both are present (expanded form usually has more detail)", () => {
    const candidate = buildNotificationCandidate({
      id: "abc-124",
      packageName: "com.kasikorn.retail.mbanking.wap",
      title: "K PLUS",
      text: "Payment sent",
      bigText: "You sent 500.00 THB to Coffee Shop",
      postedAtMs: 1_700_000_000_000,
    });

    expect(candidate?.amount).toBe(500);
    expect(candidate?.merchant).toBe("Coffee Shop");
  });

  it("returns null when no amount can be parsed -- must never reach the confirm sheet", () => {
    const candidate = buildNotificationCandidate({
      id: "abc-125",
      packageName: "com.scb.phone",
      title: "New feature available",
      text: "Check out the new SCB Easy update",
      bigText: "",
      postedAtMs: 1_700_000_000_000,
    });

    expect(candidate).toBeNull();
  });

  it("still builds a candidate (lower confidence) for an unrecognised package with a parseable amount", () => {
    const candidate = buildNotificationCandidate({
      id: "abc-126",
      packageName: "com.some.other.bank",
      title: "Payment",
      text: "100.00 บาท",
      bigText: "",
      postedAtMs: 1_700_000_000_000,
    });

    expect(candidate).not.toBeNull();
    expect(candidate?.bankId).toBeUndefined();
    expect(candidate?.amount).toBe(100);
    expect(candidate?.confidence).toBeLessThan(90);
  });
});
