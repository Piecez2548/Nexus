import { describe, expect, it } from "vitest";
import { buildMerchantAnalysis } from "@/features/finance/aiAnalytics/models/merchant-analysis.model";
import type { RecipientProfile, Transaction } from "@/features/finance/types";
import type { BehaviorAnalysisResult, TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { Recommendation } from "@/features/finance/aiAnalytics/engine/analyzers/recommendations";

function merchant(overrides: Partial<TopMerchantEntry> = {}): TopMerchantEntry {
  return {
    alias: "7-Eleven",
    category: "Convenience",
    transactionCount: 5,
    totalAmount: 500,
    averagePurchase: 100,
    lastUsedDate: "2026-07-20",
    monthlyTrend: [],
    ...overrides,
  };
}

function behavior(topMerchants: TopMerchantEntry[]): BehaviorAnalysisResult {
  return {
    flags: [],
    largePurchases: [],
    topMerchants,
    subscriptions: [],
    impulsePurchases: [],
    mostActiveHour: { hour: null, dataQuality: "unavailable" },
    mostActiveWeekday: null,
  };
}

function profile(alias: string, recipientKey: string): RecipientProfile {
  return { recipientKey, alias, category: "Convenience", transactionCount: 5, totalAmount: 500, lastUsedDate: "2026-07-20", confidenceScore: 1 };
}

function tx(recipient: string, amount: number, date: string): Transaction {
  return { title: "Test", amount, type: "expense", account: "Cash", date, recipient };
}

function rec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "test",
    key: "test",
    priority: "medium",
    estimatedMonthlySavings: 0,
    confidence: "medium",
    estimatedImpact: null,
    params: {},
    title: { key: "test", params: {} },
    reason: { key: "test", params: {} },
    action: { key: "test", params: {} },
    ...overrides,
  };
}

describe("buildMerchantAnalysis", () => {
  it("returns an empty list when there are no top merchants", () => {
    expect(buildMerchantAnalysis(behavior([]), [], [], [])).toEqual([]);
  });

  it("has a null monthlyGrowthPercent with fewer than 2 months of trend", () => {
    const [result] = buildMerchantAnalysis(behavior([merchant({ monthlyTrend: [{ monthKey: "2026-07", amount: 500 }] })]), [], [], []);
    expect(result.monthlyGrowthPercent).toBeNull();
  });

  it("computes growth from the last two trend points", () => {
    const [result] = buildMerchantAnalysis(
      behavior([
        merchant({
          monthlyTrend: [
            { monthKey: "2026-06", amount: 400 },
            { monthKey: "2026-07", amount: 500 },
          ],
        }),
      ]),
      [],
      [],
      []
    );
    expect(result.monthlyGrowthPercent).toBe(25);
  });

  it("finds the largest purchase for the merchant's recipientKey", () => {
    const [result] = buildMerchantAnalysis(
      behavior([merchant()]),
      [profile("7-Eleven", "recipient-1")],
      [tx("recipient-1", 100, "2026-07-01"), tx("recipient-1", 350, "2026-07-15"), tx("recipient-other", 999, "2026-07-10")],
      []
    );
    expect(result.largestPurchase?.amount).toBe(350);
  });

  it("has a null largestPurchase when no matching recipient profile exists", () => {
    const [result] = buildMerchantAnalysis(behavior([merchant()]), [], [tx("recipient-1", 100, "2026-07-01")], []);
    expect(result.largestPurchase).toBeNull();
  });

  it("attaches only recommendations whose params.merchant matches this merchant's alias", () => {
    const matching = rec({ id: "a", params: { merchant: "7-Eleven" } });
    const other = rec({ id: "b", params: { merchant: "Starbucks" } });

    const [result] = buildMerchantAnalysis(behavior([merchant()]), [], [], [matching, other]);
    expect(result.recommendations).toEqual([matching]);
  });
});
