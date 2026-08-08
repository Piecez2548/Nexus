// AI Quality Review (GS-049): review imported (or about-to-import) slip items
// for quality problems — missing data, suspect OCR, uncategorised, low
// confidence, duplicate risk — and produce a recommendation per flagged item.
// Deterministic and advisory (suggests fixes, changes nothing).

export interface ReviewableItem {
  id: string;
  amount?: number;
  date?: string;
  merchant?: string;
  category?: string;
  confidence: number; // 0–100
  duplicateProbability?: number; // 0–1
  ocrSuspect?: boolean;
}

export type ReviewIssue = "missing-data" | "incorrect-ocr" | "wrong-category" | "low-confidence" | "duplicate-risk";

export interface ReviewFinding {
  id: string;
  issues: ReviewIssue[];
  recommendation: string;
}

const LOW_CONFIDENCE = 50;
const DUPLICATE_RISK = 0.7;

const RECOMMENDATIONS: Record<ReviewIssue, string> = {
  "missing-data": "Fill in the missing amount, date or merchant.",
  "incorrect-ocr": "Re-check the OCR-read fields against the slip image.",
  "wrong-category": "Assign a category (currently uncategorised).",
  "low-confidence": "Verify this slip manually — extraction confidence is low.",
  "duplicate-risk": "Possible duplicate — confirm before importing.",
};

export function reviewItem(item: ReviewableItem): ReviewFinding | null {
  const issues: ReviewIssue[] = [];

  if (item.amount === undefined || !item.date || !item.merchant || item.merchant.trim() === "") {
    issues.push("missing-data");
  }
  if (item.ocrSuspect) issues.push("incorrect-ocr");
  if (!item.category || item.category === "Others") issues.push("wrong-category");
  if (item.confidence < LOW_CONFIDENCE) issues.push("low-confidence");
  if (item.duplicateProbability !== undefined && item.duplicateProbability >= DUPLICATE_RISK) {
    issues.push("duplicate-risk");
  }

  if (issues.length === 0) return null;
  return { id: item.id, issues, recommendation: issues.map((i) => RECOMMENDATIONS[i]).join(" ") };
}

export function reviewImportQuality(items: ReviewableItem[]): ReviewFinding[] {
  return items.map(reviewItem).filter((f): f is ReviewFinding => f !== null);
}
