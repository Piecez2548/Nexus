// Financial Intelligence Report (GS-050): the capstone that aggregates the
// scanner's engine outputs into one report — import accuracy, OCR accuracy, AI
// confidence, fraud summary, duplicate summary, merchant analysis and spending
// analysis — with JSON and CSV serialisers. PDF export reuses the app's
// existing jspdf-based export infrastructure (the report supplies the data; the
// UI renders it), so no PDF logic is duplicated here.

export interface FinancialReportInput {
  importAccuracy: number; // 0–100 (% of attempted imports that succeeded)
  ocrAccuracy: number; // 0–100 (avg OCR field confidence)
  aiConfidence: number; // 0–100 (avg overall confidence, GS-046)
  fraud: { high: number; medium: number; low: number };
  duplicates: { detected: number; total: number };
  topMerchants: Array<{ name: string; count: number; total: number }>;
  spendingInsights: string[];
}

export interface FinancialIntelligenceReport {
  generatedAt: string;
  importAccuracy: number;
  ocrAccuracy: number;
  aiConfidence: number;
  fraudSummary: { high: number; medium: number; low: number };
  duplicateSummary: { detected: number; total: number; rate: number };
  topMerchants: Array<{ name: string; count: number; total: number }>;
  spendingInsights: string[];
}

const round = (n: number): number => Math.round(n);

export function buildFinancialIntelligenceReport(
  input: FinancialReportInput,
  now: () => string = () => new Date().toISOString(),
): FinancialIntelligenceReport {
  const rate = input.duplicates.total > 0 ? round((input.duplicates.detected / input.duplicates.total) * 100) : 0;
  return {
    generatedAt: now(),
    importAccuracy: round(input.importAccuracy),
    ocrAccuracy: round(input.ocrAccuracy),
    aiConfidence: round(input.aiConfidence),
    fraudSummary: { ...input.fraud },
    duplicateSummary: { detected: input.duplicates.detected, total: input.duplicates.total, rate },
    topMerchants: input.topMerchants,
    spendingInsights: input.spendingInsights,
  };
}

export function reportToJson(report: FinancialIntelligenceReport): string {
  return JSON.stringify(report, null, 2);
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCsv(report: FinancialIntelligenceReport): string {
  const lines: string[] = [];
  lines.push("Metric,Value");
  lines.push(`Generated,${csvCell(report.generatedAt)}`);
  lines.push(`Import accuracy,${report.importAccuracy}%`);
  lines.push(`OCR accuracy,${report.ocrAccuracy}%`);
  lines.push(`AI confidence,${report.aiConfidence}%`);
  lines.push(`Fraud high,${report.fraudSummary.high}`);
  lines.push(`Fraud medium,${report.fraudSummary.medium}`);
  lines.push(`Fraud low,${report.fraudSummary.low}`);
  lines.push(`Duplicates,${report.duplicateSummary.detected} of ${report.duplicateSummary.total} (${report.duplicateSummary.rate}%)`);
  lines.push("");
  lines.push("Merchant,Count,Total");
  for (const m of report.topMerchants) lines.push(`${csvCell(m.name)},${m.count},${m.total}`);
  lines.push("");
  lines.push("Insight");
  for (const insight of report.spendingInsights) lines.push(csvCell(insight));
  return lines.join("\n");
}
