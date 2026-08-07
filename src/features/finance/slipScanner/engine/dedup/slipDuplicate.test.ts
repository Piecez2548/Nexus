import { describe, expect, it } from "vitest";

import { createDuplicateDetector, slipDuplicateKey } from "./slipDuplicate";

describe("slipDuplicateKey", () => {
  it("keys on the reference number when present, ignoring cosmetic formatting", () => {
    const a = slipDuplicateKey({ bank: "scb", ref1: "REF-123 456", amount: 100 });
    const b = slipDuplicateKey({ bank: "scb", ref1: "ref123456", amount: 999, merchant: "different" });
    expect(a).toBe(b); // same reference => same transaction, other fields differ
  });

  it("keeps distinct payments to the same static QR separate (no reference)", () => {
    const payload = "000201...static...";
    const first = slipDuplicateKey({ payload, amount: 100, timestamp: "2024-05-12 14:30" });
    const second = slipDuplicateKey({ payload, amount: 250, timestamp: "2024-05-12 15:00" });
    expect(first).not.toBe(second);
  });

  it("treats identical tuples as the same key", () => {
    const fields = { bank: "kbank", amount: 50.5, timestamp: "2024-01-01", merchant: "Shop A" };
    expect(slipDuplicateKey(fields)).toBe(slipDuplicateKey({ ...fields }));
  });
});

describe("createDuplicateDetector", () => {
  it("markSeen returns false the first time and true on a repeat", () => {
    const detector = createDuplicateDetector();
    const slip = { bank: "scb", ref1: "TXN0001234567", amount: 100 };
    expect(detector.markSeen(slip)).toBe(false);
    expect(detector.markSeen(slip)).toBe(true);
  });

  it("detects the same transaction arriving via QR and via OCR", () => {
    const detector = createDuplicateDetector();
    detector.register({ bank: "scb", ref1: "TXN0001234567", payload: "000201...", amount: 100 });
    // OCR read of the same slip: no payload, merchant text differs, same ref.
    expect(detector.isDuplicate({ bank: "scb", ref1: "TXN-000-123-4567", amount: 100, merchant: "SCB" })).toBe(true);
  });

  it("never flags a slip with no dedup signal", () => {
    const detector = createDuplicateDetector();
    const empty = { merchant: "someone", timestamp: "2024-01-01" };
    expect(detector.markSeen(empty)).toBe(false);
    expect(detector.markSeen(empty)).toBe(false);
    expect(detector.isDuplicate(empty)).toBe(false);
  });

  it("can be seeded with already-imported keys to block re-imports", () => {
    const slip = { bank: "kbank", ref1: "SEEDED123456" };
    const detector = createDuplicateDetector([slipDuplicateKey(slip)]);
    expect(detector.isDuplicate(slip)).toBe(true);
  });
});
