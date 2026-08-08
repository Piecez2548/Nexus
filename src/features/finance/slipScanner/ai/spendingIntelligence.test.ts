import { describe, expect, it } from "vitest";

import { generateSpendingInsights, type SpendTxn } from "./spendingIntelligence";

describe("generateSpendingInsights", () => {
  it("returns nothing for no expenses", () => {
    expect(generateSpendingInsights([])).toEqual([]);
  });

  it("identifies the top category and frequent merchant", () => {
    const txns: SpendTxn[] = [
      { amount: 300, category: "Food", merchant: "Cafe", date: "2026-08-01" },
      { amount: 200, category: "Food", merchant: "Cafe", date: "2026-08-02" },
      { amount: 50, category: "Transport", merchant: "Grab", date: "2026-08-03" },
    ];
    const insights = generateSpendingInsights(txns);
    expect(insights.find((i) => i.kind === "top-category")?.message).toContain("Food");
    expect(insights.find((i) => i.kind === "frequent-merchant")?.message).toContain("Cafe");
  });

  it("flags a sharp month-over-month increase as a warning", () => {
    const txns: SpendTxn[] = [
      { amount: 100, category: "Food", date: "2026-07-10" },
      { amount: 400, category: "Food", date: "2026-08-10" },
    ];
    const trend = generateSpendingInsights(txns).find((i) => i.kind === "monthly-trend");
    expect(trend?.severity).toBe("warning");
    expect(trend?.message).toContain("up");
  });

  it("detects an abnormally large expense", () => {
    const txns: SpendTxn[] = [
      { amount: 50, category: "Food", date: "2026-08-01" },
      { amount: 60, category: "Food", date: "2026-08-02" },
      { amount: 55, category: "Food", date: "2026-08-03" },
      { amount: 40, category: "Food", date: "2026-08-04" },
      { amount: 5000, category: "Shopping", merchant: "Mall", date: "2026-08-05" },
    ];
    const abnormal = generateSpendingInsights(txns).filter((i) => i.kind === "abnormal-expense");
    expect(abnormal.length).toBeGreaterThanOrEqual(1);
    expect(abnormal[0]!.message).toContain("Mall");
  });
});
