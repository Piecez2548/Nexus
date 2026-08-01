import { describe, expect, it } from "vitest";
import { analyzeRecurringMerchantPatterns } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/recurringPatternAnalyzer";
import type { Transaction, RecipientProfile } from "@/features/finance/types";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

function merchant(alias: string, transactionCount: number): TopMerchantEntry {
  return { alias, category: "Food", transactionCount, totalAmount: transactionCount * 100, averagePurchase: 100, lastUsedDate: "2026-07-20", monthlyTrend: [] };
}

function profile(alias: string, recipientKey: string): RecipientProfile {
  return { recipientKey, alias, category: "Food", transactionCount: 1, totalAmount: 100, lastUsedDate: "2026-07-20", confidenceScore: 1 };
}

function tx(recipient: string, date: string): Transaction {
  return { title: "Test", amount: 100, type: "expense", account: "Cash", date, recipient };
}

// All Sundays: 2026-07-05, 07-12, 07-19, 07-26
const SUNDAYS = ["2026-07-05", "2026-07-12", "2026-07-19", "2026-07-26"];

describe("analyzeRecurringMerchantPatterns", () => {
  it("returns nothing when a merchant has too few transactions overall", () => {
    const result = analyzeRecurringMerchantPatterns([merchant("Tesco", 2)], [profile("Tesco", "r1")], [tx("r1", "2026-07-05"), tx("r1", "2026-07-12")]);
    expect(result).toEqual([]);
  });

  it("returns nothing when no recipientProfile matches the merchant alias", () => {
    const transactions = SUNDAYS.map((d) => tx("r1", d));
    const result = analyzeRecurringMerchantPatterns([merchant("Tesco", 4)], [], transactions);
    expect(result).toEqual([]);
  });

  it("detects a dominant weekday when visits consistently land on the same day", () => {
    const transactions = SUNDAYS.map((d) => tx("r1", d));
    const result = analyzeRecurringMerchantPatterns([merchant("Tesco", 4)], [profile("Tesco", "r1")], transactions);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ merchantAlias: "Tesco", dominantWeekday: 0, dominantWeekdayShare: 100, occurrenceCount: 4 });
  });

  it("does not report a pattern when visits are spread across different weekdays", () => {
    const transactions = ["2026-07-05", "2026-07-06", "2026-07-07", "2026-07-08"].map((d) => tx("r1", d)); // Sun, Mon, Tue, Wed — 4 distinct days
    const result = analyzeRecurringMerchantPatterns([merchant("Tesco", 4)], [profile("Tesco", "r1")], transactions);
    expect(result).toEqual([]);
  });

  it("sorts multiple patterns by occurrence count, descending", () => {
    const smallMerchantTx = SUNDAYS.slice(0, 3).map((d) => tx("r2", d));
    const bigMerchantTx = SUNDAYS.map((d) => tx("r1", d));
    const result = analyzeRecurringMerchantPatterns(
      [merchant("Small", 3), merchant("Big", 4)],
      [profile("Small", "r2"), profile("Big", "r1")],
      [...smallMerchantTx, ...bigMerchantTx]
    );
    expect(result.map((p) => p.merchantAlias)).toEqual(["Big", "Small"]);
  });
});
