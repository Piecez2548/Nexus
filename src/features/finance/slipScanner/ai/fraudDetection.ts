// Fraud Detection Engine (GS-042): combine the signals from verification
// (GS-041), duplicate detection (GS-031) and validation into a fraud risk level
// with explicit reasons. Deterministic and advisory — it flags, it never blocks
// or mutates data on its own.

export type RiskLevel = "low" | "medium" | "high";

export interface FraudInput {
  crcValid?: boolean; // EMVCo checksum (undefined = no QR)
  verificationRisk?: number; // GS-041 risk score 0–100 (field inconsistency)
  amountMismatch?: boolean; // QR vs OCR amount disagree
  duplicateProbability?: number; // GS-031, 0–1
  timestampInFuture?: boolean; // slip dated in the future
  isScreenshot?: boolean; // heuristic: re-saved screenshot rather than an original capture
}

export interface FraudResult {
  level: RiskLevel;
  score: number; // 0–100
  reasons: string[];
}

const WEIGHTS = {
  "invalid-payload": 35,
  "duplicate-reuse": 30,
  "suspicious-ocr-mismatch": 25,
  "impossible-timestamp": 25,
  "edited-slip": 20,
  "fake-screenshot": 15,
} as const;

export function detectFraud(input: FraudInput): FraudResult {
  const reasons: string[] = [];
  let score = 0;

  const add = (reason: keyof typeof WEIGHTS): void => {
    reasons.push(reason);
    score += WEIGHTS[reason];
  };

  if (input.crcValid === false) add("invalid-payload");
  if (input.duplicateProbability !== undefined && input.duplicateProbability >= 0.85) add("duplicate-reuse");
  if (input.amountMismatch) add("suspicious-ocr-mismatch");
  if (input.timestampInFuture) add("impossible-timestamp");
  if (input.verificationRisk !== undefined && input.verificationRisk >= 50) add("edited-slip");
  if (input.isScreenshot) add("fake-screenshot");

  score = Math.min(100, score);
  const level: RiskLevel = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  return { level, score, reasons };
}
