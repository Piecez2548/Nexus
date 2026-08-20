import type { jsPDF } from "jspdf";

import type { ExecutiveSummaryReport } from "@/features/finance/aiAnalytics/engine/executiveSummary/types";
import type { FinancialHealthScoreResult, ScoreMessage } from "@/features/finance/aiAnalytics/engine/scoring/types";
import type { TranslateFn } from "@/i18n/useTranslation";

export interface AiAnalyticsReportData {
  executiveSummaryReport: ExecutiveSummaryReport;
  financialHealthScore: FinancialHealthScoreResult;
}

const PAGE_BOTTOM_MARGIN = 280;
const LINE_HEIGHT = 6;

// Narrative sections only (Executive Summary highlights/action plan,
// Health Score's overall grade + top strengths/weaknesses/recommendations)
// -- not all 13 sections AiAnalytics.tsx renders on screen, to keep the
// PDF short and the implementation bounded.
export async function buildAiAnalyticsReportPdf(data: AiAnalyticsReportData, t: TranslateFn): Promise<jsPDF> {
  const { jsPDF: JsPdf } = await import("jspdf");
  const doc = new JsPdf();

  let y = 16;

  function ensureRoom(lines: number) {
    if (y + lines * LINE_HEIGHT > PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      y = 16;
    }
  }

  function heading(text: string) {
    ensureRoom(2);
    doc.setFontSize(13);
    doc.text(text, 14, y);
    y += LINE_HEIGHT + 2;
  }

  function paragraph(text: string) {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 180) as string[];
    ensureRoom(lines.length);
    doc.text(lines, 14, y);
    y += lines.length * LINE_HEIGHT;
  }

  function bullet(text: string) {
    paragraph(`- ${text}`);
  }

  function messages(list: ScoreMessage[]) {
    for (const m of list) bullet(t(m.key, m.params));
  }

  doc.setFontSize(16);
  doc.text("Nexus Finance - AI Analytics Report", 14, y);
  y += LINE_HEIGHT + 2;
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleDateString("th-TH")}`, 14, y);
  y += LINE_HEIGHT + 4;

  const { executiveSummaryReport: summary, financialHealthScore: health } = data;

  heading("Executive Summary");
  paragraph(t(summary.headline.message.key, summary.headline.message.params));

  if (summary.highlights.entries.length > 0) {
    y += 2;
    paragraph("Highlights:");
    for (const entry of summary.highlights.entries) {
      bullet(t(entry.message.key, entry.message.params));
    }
  }

  heading("Financial Health Score");
  paragraph(
    health.overallScore === null
      ? "Not enough data to compute a score yet."
      : `Overall score: ${health.overallScore}/100 (${health.grade ?? "-"}, ${health.status ?? "-"})`
  );

  if (health.strengths.length > 0) {
    y += 2;
    paragraph("Top strengths:");
    messages(health.strengths);
  }

  if (health.weaknesses.length > 0) {
    y += 2;
    paragraph("Top weaknesses:");
    messages(health.weaknesses);
  }

  if (health.recommendations.length > 0) {
    y += 2;
    paragraph("Recommendations:");
    messages(health.recommendations);
  }

  heading("Action Plan");
  const plan = summary.actionPlan;
  const sections: Array<[string, typeof plan.immediate]> = [
    ["Immediate", plan.immediate],
    ["This Week", plan.weekly],
    ["This Month", plan.monthly],
    ["Long Term", plan.longTerm],
  ];
  for (const [label, actions] of sections) {
    if (actions.length === 0) continue;
    y += 2;
    paragraph(`${label}:`);
    for (const action of actions) bullet(t(action.key, action.params));
  }

  return doc;
}

export async function downloadAiAnalyticsReportPdf(data: AiAnalyticsReportData, t: TranslateFn): Promise<void> {
  const doc = await buildAiAnalyticsReportPdf(data, t);
  doc.save(`nexus-ai-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
