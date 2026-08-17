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

  it("omits the note when there is a bank but no reference (e.g. Payment Notification Capture, which rarely has one) -- a bare bank name isn't worth a note on its own", () => {
    const tx = candidateToTransaction(candidate({ amount: 50, bankName: "KBank" }));
    expect(tx.note).toBeUndefined();
  });

  it("falls back to the bank name for categorisation too when merchant is an empty string", () => {
    // EMVCo merchant-name tag present but empty ("") is not nullish, so a `??`
    // fallback would keep it and force categorize("") -> "Others". Title and
    // category should agree: both should be driven by the bank name here.
    const tx = candidateToTransaction(candidate({ merchant: "", amount: 20, bankName: "KBank" }));
    expect(tx.title).toBe("KBank");
    expect(tx.category).toBe("Others"); // "KBank" itself has no keyword match
  });

  it("keeps a categorize() guess that matches one of the user's live categories", () => {
    const tx = candidateToTransaction(candidate({ merchant: "Coffee Shop", amount: 20 }), {
      validCategoryNames: new Set(["Food", "Transport", "Others"]),
    });
    expect(tx.category).toBe("Food");
  });

  it("falls back to Others when the guessed category no longer exists for the user", () => {
    // e.g. the categoriser's "Healthcare" vs. the default-seeded "Health".
    const tx = candidateToTransaction(candidate({ merchant: "โรงพยาบาล", amount: 20 }), {
      validCategoryNames: new Set(["Health", "Others"]),
    });
    expect(tx.category).toBe("Others");
  });

  it("leaves category unset when neither the guess nor Others exists for the user", () => {
    const tx = candidateToTransaction(candidate({ merchant: "โรงพยาบาล", amount: 20 }), {
      validCategoryNames: new Set(["Health"]),
    });
    expect(tx.category).toBeUndefined();
  });

  it("trusts an explicit Review Queue category override over the auto-categorize() guess", () => {
    // Merchant would auto-categorize as "Food", but the user corrected it.
    const tx = candidateToTransaction(
      candidate({ merchant: "Coffee Shop", amount: 20, category: "Business Expense" }),
      { validCategoryNames: new Set(["Food", "Others"]) }, // even one NOT in the live list is still trusted
    );
    expect(tx.category).toBe("Business Expense");
  });

  it("falls through to the normal guess when the category override is blank", () => {
    const tx = candidateToTransaction(candidate({ merchant: "Coffee Shop", amount: 20, category: "   " }));
    expect(tx.category).toBe("Food");
  });
});
