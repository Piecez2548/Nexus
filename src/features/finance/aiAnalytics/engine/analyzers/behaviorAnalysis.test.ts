import { describe, expect, it } from "vitest";
import { analyzeBehavior } from "./behaviorAnalysis";
import type { WeekdayAnalysisEntry } from "./spendingAnalysis";
import type { Budget, RecipientProfile, Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 21); // 2026-07-21, Tuesday

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { title: "Item", amount: 100, type: "expense", category: "Food", account: "Cash", date: "2026-07-15", status: "completed", ...overrides };
}

function profile(overrides: Partial<RecipientProfile> = {}): RecipientProfile {
  return {
    recipientKey: "081-0000000",
    alias: "Somchai",
    category: "Food",
    transactionCount: 1,
    totalAmount: 100,
    lastUsedDate: "2026-07-15",
    confidenceScore: 1,
    ...overrides,
  };
}

function weekdayEntry(overrides: Partial<WeekdayAnalysisEntry> = {}): WeekdayAnalysisEntry {
  const total = overrides.total ?? 0;
  const count = overrides.count ?? 0;
  return { weekday: 0, total, count, average: count > 0 ? total / count : 0, ...overrides };
}

function allWeekdaysZero(): WeekdayAnalysisEntry[] {
  return Array.from({ length: 7 }, (_, weekday) => weekdayEntry({ weekday }));
}

describe("analyzeBehavior", () => {
  it("returns zeroed flags with no transactions", () => {
    const result = analyzeBehavior([], [], [], [], now);
    expect(result.flags.every((f) => f.transactionCount === 0)).toBe(true);
    expect(result.largePurchases).toEqual([]);
    expect(result.topMerchants).toEqual([]);
    expect(result.subscriptions).toEqual([]);
    expect(result.impulsePurchases).toEqual([]);
    expect(result.mostActiveHour).toEqual({ hour: null, dataQuality: "unavailable" });
    expect(result.mostActiveWeekday).toBeNull();
  });

  it("flags an eating-out transaction by category keyword match", () => {
    const result = analyzeBehavior([txn({ category: "Restaurant", amount: 500 })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "eatingOut")!;
    expect(flag.transactionCount).toBe(1);
    expect(flag.totalAmount).toBe(500);
    expect(flag.dataQuality).toBe("full");
  });

  it("flags a coffee purchase by title keyword match (Thai)", () => {
    const result = analyzeBehavior([txn({ title: "กาแฟเช้า", category: "Food", amount: 60 })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "coffee")!;
    expect(flag.transactionCount).toBe(1);
  });

  it("flags a convenience-store transaction matched via the recipient's alias", () => {
    const profiles = [profile({ recipientKey: "seven-01", alias: "7-Eleven สาขาใกล้บ้าน" })];
    const result = analyzeBehavior([txn({ recipient: "seven-01", category: "Shopping", title: "ซื้อของ", amount: 80 })], profiles, [], [], now);
    const flag = result.flags.find((f) => f.key === "convenienceStore")!;
    expect(flag.transactionCount).toBe(1);
  });

  it("flags weekend spending using the transaction's local weekday", () => {
    // 2026-07-18 is a Saturday, 2026-07-15 is a Wednesday.
    const result = analyzeBehavior([txn({ date: "2026-07-18", amount: 200 }), txn({ date: "2026-07-15", amount: 100 })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "weekendSpending")!;
    expect(flag.transactionCount).toBe(1);
    expect(flag.totalAmount).toBe(200);
  });

  it("reports nightSpending as unavailable when no transaction has a time field", () => {
    const result = analyzeBehavior([txn({ amount: 100 })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "nightSpending")!;
    expect(flag.dataQuality).toBe("unavailable");
    expect(flag.transactionCount).toBe(0);
  });

  it("flags a late-night transaction when time is present", () => {
    const result = analyzeBehavior([txn({ time: "23:30", amount: 300 })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "nightSpending")!;
    expect(flag.transactionCount).toBe(1);
    expect(flag.dataQuality).toBe("full");
  });

  it("does not flag a daytime transaction even when time is present", () => {
    const result = analyzeBehavior([txn({ time: "14:00", amount: 300 })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "nightSpending")!;
    expect(flag.transactionCount).toBe(0);
  });

  it("returns the top 5 largest purchases sorted descending by amount", () => {
    const transactions = Array.from({ length: 7 }, (_, i) => txn({ id: i + 1, amount: (i + 1) * 100, date: "2026-07-10" }));
    const result = analyzeBehavior(transactions, [], [], [], now);
    expect(result.largePurchases).toHaveLength(5);
    expect(result.largePurchases[0].amount).toBe(700);
    expect(result.largePurchases[4].amount).toBe(300);
  });

  it("reads topMerchants directly from recipientProfiles, sorted by transactionCount", () => {
    const profiles = [
      profile({ recipientKey: "a", alias: "A", transactionCount: 2 }),
      profile({ recipientKey: "b", alias: "B", transactionCount: 10 }),
    ];
    const result = analyzeBehavior([], profiles, [], [], now);
    expect(result.topMerchants[0].alias).toBe("B");
    expect(result.topMerchants[1].alias).toBe("A");
  });

  it("computes each top merchant's averagePurchase from totalAmount / transactionCount", () => {
    const profiles = [profile({ recipientKey: "a", alias: "A", transactionCount: 4, totalAmount: 800 })];
    const result = analyzeBehavior([], profiles, [], [], now);
    expect(result.topMerchants[0].averagePurchase).toBe(200);
  });

  it("buckets a top merchant's monthlyTrend by matching transactions to their recipientKey across a trailing 6-month window", () => {
    const profiles = [profile({ recipientKey: "a", alias: "A", transactionCount: 2, totalAmount: 150 })];
    const transactions = [
      txn({ recipient: "a", amount: 100, date: "2026-07-05" }),
      txn({ recipient: "a", amount: 50, date: "2026-06-05" }),
      txn({ recipient: "other", amount: 999, date: "2026-07-05" }),
    ];
    const result = analyzeBehavior(transactions, profiles, [], [], now);
    const trend = result.topMerchants[0].monthlyTrend;
    expect(trend).toHaveLength(6);
    expect(trend.find((m) => m.monthKey === "2026-07")?.amount).toBe(100);
    expect(trend.find((m) => m.monthKey === "2026-06")?.amount).toBe(50);
  });

  it("scopes flags/largePurchases to the trailing 3-month window, excluding older transactions", () => {
    const result = analyzeBehavior([txn({ category: "Restaurant", amount: 500, date: "2026-01-01" })], [], [], [], now);
    const flag = result.flags.find((f) => f.key === "eatingOut")!;
    expect(flag.transactionCount).toBe(0);
  });

  describe("subscriptions", () => {
    it("detects a recurring monthly charge with regular gaps and near-identical amounts", () => {
      const transactions = [
        txn({ id: 1, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-05-01" }),
        txn({ id: 2, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-06-01" }),
        txn({ id: 3, title: "Netflix", category: "Entertainment", amount: 300, date: "2026-07-01" }),
      ];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0]).toMatchObject({ representativeTitle: "Netflix", occurrenceCount: 3, lastDate: "2026-07-01" });
    });

    it("does not detect a subscription when the gap between charges is irregular", () => {
      const transactions = [
        txn({ id: 1, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-05-01" }),
        txn({ id: 2, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-05-10" }),
      ];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.subscriptions).toEqual([]);
    });

    it("does not detect a subscription when amounts vary by more than 10%", () => {
      const transactions = [
        txn({ id: 1, title: "Netflix", category: "Entertainment", amount: 100, date: "2026-05-01" }),
        txn({ id: 2, title: "Netflix", category: "Entertainment", amount: 130, date: "2026-06-01" }),
      ];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.subscriptions).toEqual([]);
    });

    it("does not detect a subscription that has gone quiet for over 45 days", () => {
      const transactions = [
        txn({ id: 1, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-04-01" }),
        txn({ id: 2, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-05-01" }),
      ];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.subscriptions).toEqual([]);
    });

    it("requires at least 2 occurrences", () => {
      const transactions = [txn({ id: 1, title: "Netflix", category: "Entertainment", amount: 299, date: "2026-07-01" })];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.subscriptions).toEqual([]);
    });
  });

  describe("impulsePurchases", () => {
    it("flags a transaction far above the window average with no matching budget as aboveAverageNoBudget", () => {
      const transactions = [
        txn({ id: 1, title: "Big TV", category: "Shopping", amount: 1000, date: "2026-07-05" }),
        txn({ id: 2, title: "Snack", category: "Food", amount: 100, date: "2026-07-06" }),
        txn({ id: 3, title: "Snack", category: "Food", amount: 100, date: "2026-07-07" }),
        txn({ id: 4, title: "Snack", category: "Food", amount: 100, date: "2026-07-08" }),
        txn({ id: 5, title: "Snack", category: "Food", amount: 100, date: "2026-07-09" }),
      ];
      const result = analyzeBehavior(transactions, [], [], [], now);
      const entry = result.impulsePurchases.find((p) => p.id === 1);
      expect(entry).toMatchObject({ reason: "aboveAverageNoBudget", amount: 1000 });
    });

    it("does not flag an above-average transaction when its category has a budget", () => {
      const transactions = [
        txn({ id: 1, title: "Big TV", category: "Shopping", amount: 1000, date: "2026-07-05" }),
        txn({ id: 2, title: "Snack", category: "Food", amount: 100, date: "2026-07-06" }),
        txn({ id: 3, title: "Snack", category: "Food", amount: 100, date: "2026-07-07" }),
        txn({ id: 4, title: "Snack", category: "Food", amount: 100, date: "2026-07-08" }),
        txn({ id: 5, title: "Snack", category: "Food", amount: 100, date: "2026-07-09" }),
      ];
      const budgets: Budget[] = [{ id: 1, category: "Shopping", amount: 5000, period: "monthly" }];
      const result = analyzeBehavior(transactions, [], budgets, [], now);
      expect(result.impulsePurchases.some((p) => p.id === 1)).toBe(false);
    });

    it("flags 2+ same-day expenses in a discretionary keyword-flagged category as multipleSameDay", () => {
      const transactions = [
        txn({ id: 1, title: "Lunch", category: "Restaurant", amount: 150, date: "2026-07-10" }),
        txn({ id: 2, title: "Dinner", category: "Restaurant", amount: 200, date: "2026-07-10" }),
      ];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.impulsePurchases).toHaveLength(2);
      expect(result.impulsePurchases.every((p) => p.reason === "multipleSameDay")).toBe(true);
    });

    it("does not flag a single discretionary-category expense on its own", () => {
      const transactions = [txn({ id: 1, title: "Lunch", category: "Restaurant", amount: 150, date: "2026-07-10" })];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.impulsePurchases).toEqual([]);
    });
  });

  describe("mostActiveHour", () => {
    it("picks the hour with the highest total spend when time data is fully available", () => {
      const transactions = [txn({ time: "14:00", amount: 100, date: "2026-07-05" }), txn({ time: "09:00", amount: 50, date: "2026-07-06" })];
      const result = analyzeBehavior(transactions, [], [], [], now);
      expect(result.mostActiveHour).toEqual({ hour: 14, dataQuality: "full" });
    });

    it("reports thin data quality when only some transactions in the window have a time", () => {
      const withTime = txn({ time: "14:00", amount: 100, date: "2026-07-05" });
      const withoutTime = Array.from({ length: 9 }, (_, i) => txn({ id: i + 10, amount: 10, date: "2026-07-06" }));
      const result = analyzeBehavior([withTime, ...withoutTime], [], [], [], now);
      expect(result.mostActiveHour.dataQuality).toBe("thin");
    });

    it("reports unavailable and a null hour when no transaction has a time", () => {
      const result = analyzeBehavior([txn({ amount: 100, date: "2026-07-05" })], [], [], [], now);
      expect(result.mostActiveHour).toEqual({ hour: null, dataQuality: "unavailable" });
    });
  });

  describe("mostActiveWeekday", () => {
    it("passes through the weekdayAnalysis entry with the highest total", () => {
      const weekdayAnalysis = allWeekdaysZero();
      weekdayAnalysis[1] = weekdayEntry({ weekday: 1, total: 500, count: 3 });
      weekdayAnalysis[3] = weekdayEntry({ weekday: 3, total: 200, count: 2 });
      const result = analyzeBehavior([], [], [], weekdayAnalysis, now);
      expect(result.mostActiveWeekday).toEqual(weekdayAnalysis[1]);
    });

    it("returns null when every weekday has zero activity", () => {
      const result = analyzeBehavior([], [], [], allWeekdaysZero(), now);
      expect(result.mostActiveWeekday).toBeNull();
    });
  });
});
