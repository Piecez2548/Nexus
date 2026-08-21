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

  it("defaults to expense when the candidate carries no explicit type (a scanned slip is always an outgoing payment)", () => {
    const tx = candidateToTransaction(candidate({ amount: 50 }));
    expect(tx.type).toBe("expense");
  });

  it("honours an explicit income type (Payment Notification Capture, where a notification can be incoming money)", () => {
    const tx = candidateToTransaction(candidate({ amount: 500, bankName: "KBank", type: "income" }));
    expect(tx.type).toBe("income");
  });

  it("leaves category unset for an income candidate instead of applying the expense-oriented categorize() guess", () => {
    // "Coffee Shop" would auto-categorize as "Food" for an expense -- an
    // expense-shaped category name on an income row would be a real bug
    // (reproduced live: Payment Notification Capture's confirm sheet only
    // filters its category *chips* by type, so an income transaction left
    // uncategorized by the user still fell through to this guess).
    const tx = candidateToTransaction(candidate({ merchant: "Coffee Shop", amount: 500, type: "income" }));
    expect(tx.category).toBeUndefined();
  });

  it("still trusts an explicit category override on an income candidate (a user's own chip pick, not a guess)", () => {
    const tx = candidateToTransaction(candidate({ merchant: "Coffee Shop", amount: 500, type: "income", category: "Salary" }));
    expect(tx.category).toBe("Salary");
  });

  it("still recognises a Salary guess for an income candidate -- the one keyword category that's actually income-shaped", () => {
    const tx = candidateToTransaction(candidate({ merchant: "เงินเดือน สิงหาคม", amount: 30000, type: "income" }));
    expect(tx.category).toBe("Salary");
  });

  it("does not apply an 'Investment' guess to an income candidate, even though the name reads income-adjacent", () => {
    // This app's own seeded "Investment" category is type: "expense" (money
    // spent buying stocks) -- applying the guess here would stamp an
    // expense-shaped category name onto an income row.
    const tx = candidateToTransaction(candidate({ merchant: "ซื้อกองทุน", amount: 5000, type: "income" }));
    expect(tx.category).toBeUndefined();
  });

  it("still honours a learned correction for an income candidate even when it isn't Salary (an explicit past human choice, not a keyword guess)", () => {
    const learned = new Map([["freelance client x", "Shopping" as const]]);
    const tx = candidateToTransaction(candidate({ merchant: "Freelance Client X", amount: 8000, type: "income" }), {
      learnedCategories: learned,
    });
    expect(tx.category).toBe("Shopping");
  });
});
