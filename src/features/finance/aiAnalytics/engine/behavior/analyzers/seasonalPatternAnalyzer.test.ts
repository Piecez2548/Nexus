import { describe, expect, it } from "vitest";
import { analyzeSeasonalPattern } from "@/features/finance/aiAnalytics/engine/behavior/analyzers/seasonalPatternAnalyzer";
import type { Transaction } from "@/features/finance/types";

const now = new Date(2026, 6, 30); // 2026-07-30

function tx(date: string, amount: number): Transaction {
  return { title: "Test", amount, type: "expense", account: "Cash", date };
}

describe("analyzeSeasonalPattern", () => {
  it("is all-zero and even with no transactions this month", () => {
    const result = analyzeSeasonalPattern([], now);
    expect(result).toEqual({ beginning: 0, middle: 0, end: 0, dominantPhase: "even" });
  });

  it("buckets days 1-10 as beginning, 11-20 as middle, 21+ as end", () => {
    const result = analyzeSeasonalPattern([tx("2026-07-05", 100), tx("2026-07-15", 200), tx("2026-07-25", 300)], now);
    expect(result).toMatchObject({ beginning: 100, middle: 200, end: 300 });
  });

  it("ignores transactions outside the current month", () => {
    const result = analyzeSeasonalPattern([tx("2026-06-05", 999), tx("2026-07-05", 100)], now);
    expect(result.beginning).toBe(100);
  });

  it("reports the dominant phase when one phase clearly leads", () => {
    const result = analyzeSeasonalPattern([tx("2026-07-05", 1000), tx("2026-07-15", 100), tx("2026-07-25", 100)], now);
    expect(result.dominantPhase).toBe("beginning");
  });

  it("reports even when the split is roughly equal across all three phases", () => {
    const result = analyzeSeasonalPattern([tx("2026-07-05", 100), tx("2026-07-15", 100), tx("2026-07-25", 100)], now);
    expect(result.dominantPhase).toBe("even");
  });
});
