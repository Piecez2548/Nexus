import { describe, expect, it } from "vitest";
import { analyzeDomainSpending } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/domainSpendingAnalyzer";
import type { Transaction, RecipientProfile } from "@/features/finance/types";

const now = new Date(2026, 6, 30);
const keywords = ["restaurant", "dine"];

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Restaurant dinner", amount: 300, type: "expense", account: "Cash", date: "2026-07-15", ...overrides };
}

describe("analyzeDomainSpending", () => {
  it("returns an all-zero shape with no matching transactions", () => {
    const result = analyzeDomainSpending([tx({ title: "Groceries" })], keywords, [], now);
    expect(result).toMatchObject({ totalSpent: 0, transactionCount: 0, averagePerVisit: 0, topMerchant: null });
    expect(result.monthlyTrend).toHaveLength(6);
    expect(result.weeklyTrend).toHaveLength(8);
  });

  it("totals only keyword-matching expense transactions", () => {
    const transactions = [tx({ amount: 300 }), tx({ amount: 200 }), tx({ title: "Groceries", amount: 500 })];
    const result = analyzeDomainSpending(transactions, keywords, [], now);
    expect(result.totalSpent).toBe(500);
    expect(result.transactionCount).toBe(2);
    expect(result.averagePerVisit).toBe(250);
  });

  it("matches via recipient alias, not just title/category", () => {
    const recipientProfiles: RecipientProfile[] = [{ recipientKey: "r1", alias: "My Favorite Restaurant", category: "Food", transactionCount: 1, totalAmount: 300, lastUsedDate: "2026-07-15", confidenceScore: 1 }];
    const transactions = [tx({ title: "Payment", recipient: "r1" })];
    const result = analyzeDomainSpending(transactions, keywords, recipientProfiles, now);
    expect(result.transactionCount).toBe(1);
  });

  it("identifies the top merchant by total amount among matches", () => {
    const recipientProfiles: RecipientProfile[] = [{ recipientKey: "r1", alias: "Restaurant A", category: "Food", transactionCount: 1, totalAmount: 100, lastUsedDate: "2026-07-15", confidenceScore: 1 }];
    const transactions = [tx({ title: "restaurant b", amount: 100, recipient: undefined }), tx({ title: "restaurant order", amount: 500, recipient: "r1" })];
    const result = analyzeDomainSpending(transactions, keywords, recipientProfiles, now);
    expect(result.topMerchant?.alias).toBe("Restaurant A");
    expect(result.topMerchant?.totalAmount).toBe(500);
  });
});
