import { rowsToCsv } from "@/utils/csv";
import type { FinancialSummaryData } from "@/features/finance/utils/financialSummaryPdf";

export function financialSummaryToCsv(data: FinancialSummaryData): string {
  const monthlyRows = [
    ["Month", "Income", "Expense", "Net Saving", "Saving Rate"],
    ...data.monthlyTrend.map((m) => [
      m.monthKey,
      String(m.income),
      String(m.expense),
      String(m.saving),
      m.savingRatePercent === null ? "" : `${m.savingRatePercent.toFixed(1)}%`,
    ]),
    [],
    ["Category", "Amount", "% of Total"],
    ...data.topCategories.map((c) => [c.category, String(c.amount), `${c.percentOfTotal.toFixed(1)}%`]),
  ];

  return rowsToCsv(monthlyRows);
}
