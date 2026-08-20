import { describe, expect, it } from "vitest";
import { buildFinancialSummaryPdf, type FinancialSummaryData } from "./financialSummaryPdf";

const emptyData: FinancialSummaryData = { monthlyTrend: [], topCategories: [] };

describe("buildFinancialSummaryPdf", () => {
  it("builds a PDF document without throwing for empty data", async () => {
    const doc = await buildFinancialSummaryPdf(emptyData);
    expect(doc.output("datauristring")).toContain("data:application/pdf");
  });

  it("builds a PDF document containing monthly trend and category rows", async () => {
    const data: FinancialSummaryData = {
      monthlyTrend: [
        { monthKey: "2026-07", income: 30000, expense: 20000, saving: 10000, savingRatePercent: 33.3, netCashFlow: 10000 },
      ],
      topCategories: [{ category: "Food", amount: 5000, percentOfTotal: 25 }],
    };

    const doc = await buildFinancialSummaryPdf(data);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
