import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { candidateToTransaction } from "./candidateToTransaction";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 80,
  ...over,
});

describe("candidateToTransaction", () => {
  it("maps a slip to a completed expense with bank + reference in the note", () => {
    const tx = candidateToTransaction(
      candidate({ merchant: "Coffee Shop", amount: 120, date: "2024-05-12", time: "14:30", bankName: "SCB", reference: "TX111" }),
    );
    expect(tx).toMatchObject({
      title: "Coffee Shop",
      amount: 120,
      type: "expense",
      status: "completed",
      date: "2024-05-12",
      time: "14:30",
      note: "SCB · TX111",
      category: "Food", // auto-categorised from "Coffee Shop"
    });
  });

  it("titles by bank name when there is no merchant", () => {
    const tx = candidateToTransaction(candidate({ amount: 20, bankName: "KBank" }));
    expect(tx.title).toBe("KBank");
    expect(tx.category).toBe("Others"); // no keyword match → Others, not empty
  });

  it("uses the fallback title and default account when the slip lacks a merchant and bank", () => {
    const tx = candidateToTransaction(candidate({ amount: 50 }), { fallbackTitle: "Slip import", defaultAccount: "Bank" });
    expect(tx.title).toBe("Slip import");
    expect(tx.account).toBe("Bank");
  });

  it("falls back to the injected today when the slip carries no date", () => {
    const tx = candidateToTransaction(candidate({ amount: 50 }), { today: () => "2026-08-08" });
    expect(tx.date).toBe("2026-08-08");
  });

  it("omits the note when there is no bank or reference", () => {
    expect(candidateToTransaction(candidate({ amount: 50 })).note).toBeUndefined();
  });
});
