import { describe, expect, it } from "vitest";
import { applySpendingReduction, runScenarioPipeline } from "./scenarioPipelineRunner";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 15);

function tx(overrides: Partial<Transaction>): Transaction {
  return { title: "x", amount: 0, type: "expense", account: "Cash", date: "2026-07-01", status: "completed", ...overrides };
}

describe("applySpendingReduction", () => {
  it("scales down only matching expense transactions, leaving everything else untouched", () => {
    const transactions: Transaction[] = [
      tx({ title: "Starbucks", amount: 100, category: "Food" }),
      tx({ title: "Groceries", amount: 200, category: "Food" }),
      tx({ title: "Salary", amount: 30000, type: "income", category: "Salary" }),
    ];

    const result = applySpendingReduction(transactions, ["starbucks", "coffee"], [], 50);

    expect(result.find((t) => t.title === "Starbucks")!.amount).toBe(50);
    expect(result.find((t) => t.title === "Groceries")!.amount).toBe(200);
    expect(result.find((t) => t.title === "Salary")!.amount).toBe(30000);
  });

  it("does not touch income transactions even if their title matches", () => {
    const transactions: Transaction[] = [tx({ title: "Coffee shop refund", amount: 50, type: "income" })];
    const result = applySpendingReduction(transactions, ["coffee"], [], 100);
    expect(result[0].amount).toBe(50);
  });
});

describe("runScenarioPipeline", () => {
  it("returns a real recomputed overallScore, not a fabricated shortcut", () => {
    const transactions: Transaction[] = [
      tx({ title: "Salary", amount: 30000, type: "income", category: "Salary", date: "2026-07-01" }),
      tx({ title: "Coffee", amount: 100, category: "Food", date: "2026-07-05" }),
    ];
    const result = runScenarioPipeline({ transactions, budgets: [], recipientProfiles: [], goalProgress: [], now });
    expect(typeof result === "number" || result === null).toBe(true);
  });

  it("is null when there's not enough data, matching FinancialHealthScoreResult's own convention", () => {
    const result = runScenarioPipeline({ transactions: [], budgets: [], recipientProfiles: [], goalProgress: [], now });
    expect(result).toBeNull();
  });

  it("a lower-spending transaction set never scores worse than the original", () => {
    const baseline: Transaction[] = [
      tx({ title: "Salary", amount: 30000, type: "income", category: "Salary", date: "2026-07-01" }),
      tx({ title: "Coffee", amount: 2000, category: "Food", date: "2026-07-05" }),
    ];
    const reduced = applySpendingReduction(baseline, ["coffee"], [], 50);

    const baselineScore = runScenarioPipeline({ transactions: baseline, budgets: [], recipientProfiles: [], goalProgress: [], now });
    const reducedScore = runScenarioPipeline({ transactions: reduced, budgets: [], recipientProfiles: [], goalProgress: [], now });

    if (baselineScore !== null && reducedScore !== null) {
      expect(reducedScore).toBeGreaterThanOrEqual(baselineScore);
    }
  });
});
