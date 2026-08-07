import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { toLocalDateString } from "@/utils/localDate";

// Advisory validation for a scanned slip before import. This is the app's
// local, rule-based "AI" (the LLM Gateway stays unwired — see ROADMAP), so it
// is fully deterministic. Its hard contract: it NEVER modifies the candidate —
// it only returns findings for the user to act on. It verifies the fields the
// task lists (amount, merchant, date, duplicate probability, confidence).

export type SlipIssueSeverity = "info" | "warning" | "error";
export type SlipIssueField = "amount" | "merchant" | "date" | "duplicate" | "confidence";

export interface SlipIssue {
  field: SlipIssueField;
  severity: SlipIssueSeverity;
  code: string;
}

export interface SlipValidationResult {
  valid: boolean; // no error-severity issues
  issues: SlipIssue[];
  duplicateProbability: number; // 0–1
}

export interface SlipValidationOptions {
  lowConfidence?: number; // below this, warn (default 50)
  implausibleAmount?: number; // above this, warn (default 10,000,000)
  today?: () => string; // injectable clock (YYYY-MM-DD)
}

const DEFAULT_LOW_CONFIDENCE = 50;
const DEFAULT_IMPLAUSIBLE_AMOUNT = 10_000_000;

// A duplicate flagged by the dedup engine (GS-013) is near-certain; otherwise
// it is low. The Smart Duplicate Engine (GS-031) refines this into a graded
// similarity score later.
function duplicateProbability(candidate: SlipCandidate): number {
  return candidate.isDuplicate ? 0.9 : 0.1;
}

// Verify a candidate. Pure: the input is never mutated.
export function validateSlipCandidate(
  candidate: SlipCandidate,
  options: SlipValidationOptions = {},
): SlipValidationResult {
  const {
    lowConfidence = DEFAULT_LOW_CONFIDENCE,
    implausibleAmount = DEFAULT_IMPLAUSIBLE_AMOUNT,
    today = () => toLocalDateString(new Date()),
  } = options;

  const issues: SlipIssue[] = [];

  // Amount
  if (candidate.amount === undefined) {
    issues.push({ field: "amount", severity: "error", code: "amount-missing" });
  } else if (!(candidate.amount > 0)) {
    issues.push({ field: "amount", severity: "error", code: "amount-non-positive" });
  } else if (candidate.amount > implausibleAmount) {
    issues.push({ field: "amount", severity: "warning", code: "amount-implausible" });
  }

  // Merchant
  if (!candidate.merchant || candidate.merchant.trim() === "") {
    issues.push({ field: "merchant", severity: "warning", code: "merchant-missing" });
  }

  // Date
  if (!candidate.date) {
    issues.push({ field: "date", severity: "warning", code: "date-missing" });
  } else if (candidate.date > today()) {
    // A slip's date cannot be in the future.
    issues.push({ field: "date", severity: "warning", code: "date-in-future" });
  }

  // Duplicate probability
  const dupProbability = duplicateProbability(candidate);
  if (candidate.isDuplicate) {
    issues.push({ field: "duplicate", severity: "warning", code: "possible-duplicate" });
  }

  // Confidence
  if (candidate.confidence < lowConfidence) {
    issues.push({ field: "confidence", severity: "warning", code: "low-confidence" });
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
    duplicateProbability: dupProbability,
  };
}

// Batch helper — validates each candidate independently.
export function validateSlipCandidates(
  candidates: SlipCandidate[],
  options?: SlipValidationOptions,
): Map<string, SlipValidationResult> {
  const results = new Map<string, SlipValidationResult>();
  for (const candidate of candidates) results.set(candidate.id, validateSlipCandidate(candidate, options));
  return results;
}
