import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// Tamper detection for scanned slips. The strongest signal is the EMVCo CRC
// (GS-010) — a mismatched checksum means the QR's bytes were altered or
// mis-decoded. On top of that, a slip whose content matches one already seen
// (GS-013 duplicate) can indicate a *replayed* slip presented as a fresh
// payment. This surfaces those as explicit, named reasons rather than silently
// trusting the data.

export interface TamperResult {
  tampered: boolean;
  reasons: string[];
}

// Integrity of a parsed payload: fails when the CRC doesn't validate.
export function detectPayloadTamper(payload: EmvcoPayload): TamperResult {
  const reasons: string[] = [];
  if (!payload.crcValid) reasons.push("crc-mismatch");
  return { tampered: reasons.length > 0, reasons };
}

// A QR-sourced slip flagged as a duplicate is a potential replay — the same
// verified payment being imported again from a re-saved image.
export function isReplayedSlip(candidate: SlipCandidate): boolean {
  return candidate.source === "qr" && candidate.isDuplicate;
}

// Combined per-candidate assessment. Non-positive or absurd amounts are cheap
// sanity checks a genuine slip never trips.
export function detectCandidateTamper(candidate: SlipCandidate): TamperResult {
  const reasons: string[] = [];
  if (isReplayedSlip(candidate)) reasons.push("possible-replay");
  if (candidate.amount !== undefined && candidate.amount <= 0) reasons.push("non-positive-amount");
  return { tampered: reasons.length > 0, reasons };
}
