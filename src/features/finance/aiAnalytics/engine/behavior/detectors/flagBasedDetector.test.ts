import { describe, expect, it } from "vitest";
import { detectFlagHabit, recentWindowExpense, confidenceForCount } from "@/features/finance/aiAnalytics/engine/behavior/detectors/flagBasedDetector";
import type { BehaviorFlag } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { CashFlowAnalysisResult, CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

function flag(overrides: Partial<BehaviorFlag> = {}): BehaviorFlag {
  return { key: "eatingOut", transactionCount: 5, totalAmount: 1000, dataQuality: "full", ...overrides };
}

const thresholds = { highSharePercent: 30, lowSharePercent: 5 };

describe("detectFlagHabit", () => {
  it("is null when the flag has no transactions", () => {
    expect(detectFlagHabit(flag({ transactionCount: 0, totalAmount: 0 }), 10000, "restaurant", thresholds)).toBeNull();
  });

  it("is null when data quality is unavailable", () => {
    expect(detectFlagHabit(flag({ dataQuality: "unavailable" }), 10000, "lateNight", thresholds)).toBeNull();
  });

  it("is negative when the flag's share of window expense is at or above the high threshold", () => {
    const result = detectFlagHabit(flag({ totalAmount: 4000 }), 10000, "restaurant", thresholds); // 40%
    expect(result?.polarity).toBe("negative");
  });

  it("is positive when the flag's share is at or below the low threshold", () => {
    const result = detectFlagHabit(flag({ totalAmount: 300 }), 10000, "restaurant", thresholds); // 3%
    expect(result?.polarity).toBe("positive");
  });

  it("is neutral in between the two thresholds", () => {
    const result = detectFlagHabit(flag({ totalAmount: 1500 }), 10000, "restaurant", thresholds); // 15%
    expect(result?.polarity).toBe("neutral");
  });

  it("treats zero window expense as a 0% share", () => {
    const result = detectFlagHabit(flag({ totalAmount: 500 }), 0, "restaurant", thresholds);
    expect(result?.polarity).toBe("positive");
  });

  it("namespaces the message key by habitId and polarity", () => {
    const result = detectFlagHabit(flag({ totalAmount: 4000 }), 10000, "restaurant", thresholds);
    expect(result?.message.key).toBe("aiAnalytics.behaviorProfile.detectors.restaurant.negative");
  });
});

describe("confidenceForCount", () => {
  it.each([
    [15, 85],
    [10, 85],
    [9, 60],
    [3, 60],
    [2, 35],
    [0, 35],
  ])("maps count %i to confidence %i", (count, expected) => {
    expect(confidenceForCount(count)).toBe(expected);
  });
});

describe("recentWindowExpense", () => {
  function monthPoint(expense: number): CashFlowMonthPoint {
    return { monthKey: "2026-01", income: 0, expense, saving: 0, savingRatePercent: null, netCashFlow: 0 };
  }

  it("sums the trailing 3 months of expense by default", () => {
    const cashFlowAnalysis: CashFlowAnalysisResult = {
      income: 0,
      expense: 0,
      saving: 0,
      savingRatePercent: null,
      netCashFlow: 0,
      changeVsPreviousMonth: { income: null, expense: null, saving: null },
      monthlyTrend: [monthPoint(1000), monthPoint(1000), monthPoint(1000), monthPoint(2000), monthPoint(3000), monthPoint(4000)],
    };
    expect(recentWindowExpense(cashFlowAnalysis)).toBe(9000); // last 3: 2000+3000+4000
  });
});
