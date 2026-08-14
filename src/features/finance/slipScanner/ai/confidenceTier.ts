import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// Confidence-tier policy: turns SlipCandidate.confidence (GS-046's
// combineConfidence score) into an action tier. Thresholds are a deliberate
// starting point, not a calibrated result -- there is no usage data yet to
// calibrate against. "high" is set conservatively (matches the Import
// Conflict Resolver's own 0.85-probability bar, so both auto-decisions in
// this pipeline agree on what "near-certain" means) specifically so a wrong
// auto-import is rare even before any tuning. Revisit once
// ScannerAnalytics/ImportHistory (both already recorded) have enough real
// runs to show how often each tier actually needed correcting.
export type ConfidenceTier = "critical" | "low" | "medium" | "high";

export const CONFIDENCE_TIER_THRESHOLDS = { high: 85, medium: 60 } as const;

// A missing or non-positive amount is never auto-import-eligible, regardless
// of confidence -- matches runSmartImport's own existing hard gate, so this
// tier and that gate can never disagree with each other.
function hasCriticalFieldMissing(candidate: Pick<SlipCandidate, "amount">): boolean {
  return candidate.amount === undefined || !(candidate.amount > 0);
}

export function confidenceTier(candidate: Pick<SlipCandidate, "confidence" | "amount">): ConfidenceTier {
  if (hasCriticalFieldMissing(candidate)) return "critical";
  if (candidate.confidence >= CONFIDENCE_TIER_THRESHOLDS.high) return "high";
  if (candidate.confidence >= CONFIDENCE_TIER_THRESHOLDS.medium) return "medium";
  return "low";
}

// Only a "high" tier (and not already flagged as a duplicate) is safe to
// pre-select for import without the user having looked at it first. Everything
// else -- medium/low confidence, a missing critical field, or a likely
// duplicate -- needs an explicit look, per the "never silently auto-import
// something uncertain" rule.
export function isAutoImportEligible(candidate: Pick<SlipCandidate, "confidence" | "amount" | "isDuplicate">): boolean {
  return !candidate.isDuplicate && confidenceTier(candidate) === "high";
}
