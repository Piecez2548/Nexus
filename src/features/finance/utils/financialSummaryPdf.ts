import type { jsPDF } from "jspdf";

import type { CashFlowMonthPoint } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";
import type { TopCategoryEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

export interface FinancialSummaryData {
  monthlyTrend: CashFlowMonthPoint[];
  topCategories: TopCategoryEntry[];
}

// jsPDF (plus its autotable plugin) is a heavy dependency only needed by
// the "Export PDF" button — imported dynamically, mirroring transactionPdf.ts.
export async function buildFinancialSummaryPdf(data: FinancialSummaryData): Promise<jsPDF> {
  const [{ jsPDF: JsPdf }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPdf();

  doc.setFontSize(16);
  doc.text("Nexus Finance - Financial Summary", 14, 16);

  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleDateString("th-TH")}`, 14, 22);

  doc.setFontSize(12);
  doc.text("Monthly Trend", 14, 32);

  autoTable(doc, {
    startY: 36,
    head: [["Month", "Income", "Expense", "Net Saving", "Saving Rate"]],
    body: data.monthlyTrend.map((m) => [
      m.monthKey,
      m.income.toLocaleString(),
      m.expense.toLocaleString(),
      m.saving.toLocaleString(),
      m.savingRatePercent === null ? "-" : `${m.savingRatePercent.toFixed(1)}%`,
    ]),
  });

  const afterMonthlyY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFontSize(12);
  doc.text("Top Spending Categories (This Month)", 14, afterMonthlyY + 10);

  autoTable(doc, {
    startY: afterMonthlyY + 14,
    head: [["Category", "Amount", "% of Total"]],
    body: data.topCategories.map((c) => [c.category, c.amount.toLocaleString(), `${c.percentOfTotal.toFixed(1)}%`]),
  });

  return doc;
}

export async function downloadFinancialSummaryPdf(data: FinancialSummaryData): Promise<void> {
  const doc = await buildFinancialSummaryPdf(data);
  doc.save(`nexus-financial-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}
