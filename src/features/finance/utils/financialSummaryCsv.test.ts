import { describe, expect, it } from "vitest";
import { financialSummaryToCsv } from "./financialSummaryCsv";
import type { FinancialSummaryData } from "./financialSummaryPdf";

describe("financialSummaryToCsv", () => {
  it("produces a header-only CSV for empty data", () => {
    const csv = financialSummaryToCsv({ monthlyTrend: [], topCategories: [] });
    expect(csv).toContain("Month,Income,Expense,Net Saving,Saving Rate");
    expect(csv).toContain("Category,Amount,% of Total");
  });

  it("includes monthly trend and category rows", () => {
    const data: FinancialSummaryData = {
      monthlyTrend: [
        { monthKey: "2026-07", income: 30000, expense: 20000, saving: 10000, savingRatePercent: 33.3, netCashFlow: 10000 },
      ],
      topCategories: [{ category: "Food", amount: 5000, percentOfTotal: 25 }],
    };

    const csv = financialSummaryToCsv(data);
    expect(csv).toContain("2026-07,30000,20000,10000,33.3%");
    expect(csv).toContain("Food,5000,25.0%");
  });

  it("renders a null saving rate as an empty field, not the literal 'null'", () => {
    const data: FinancialSummaryData = {
      monthlyTrend: [{ monthKey: "2026-07", income: 0, expense: 0, saving: 0, savingRatePercent: null, netCashFlow: 0 }],
      topCategories: [],
    };

    const csv = financialSummaryToCsv(data);
    expect(csv).toContain("2026-07,0,0,0,");
    expect(csv).not.toContain("null");
  });
});
