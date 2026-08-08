// AI Slip Verification (GS-041): cross-check the QR-derived and OCR-derived
// views of a slip for consistency and produce authenticity / confidence / risk
// scores with explicit reasons. Fully deterministic (the app's local rule-based
// "AI") and advisory only — it NEVER modifies imported data. Distinct from
// GS-042 (fraud) which adds heuristics on top of these consistency signals.

export interface VerificationView {
  amount?: number;
  merchant?: string;
  reference?: string;
}

export interface VerificationInput {
  qr?: VerificationView | null; // EMVCo/QR-derived fields
  ocr?: VerificationView | null; // OCR-derived fields
  crcValid?: boolean; // EMVCo checksum result (undefined = no QR)
  bankIdentified?: boolean;
  timestampValid?: boolean;
}

export interface VerificationScores {
  authenticity: number; // 0–100, higher = more likely genuine
  confidence: number; // 0–100, higher = more sure of the extracted data
  risk: number; // 0–100, higher = more suspicious
  reasons: string[];
}

function norm(value: string | undefined): string {
  return value ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function normRef(value: string | undefined): string {
  return value ? value.trim().toUpperCase().replace(/[\s-]/g, "") : "";
}

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

export function verifySlip(input: VerificationInput): VerificationScores {
  const qr = input.qr ?? {};
  const ocr = input.ocr ?? {};
  const reasons: string[] = [];

  let risk = 0;
  let confidence = 40;

  if (input.crcValid === false) {
    risk += 40;
    reasons.push("crc-invalid");
  } else if (input.crcValid === true) {
    confidence += 20;
  }

  if (input.bankIdentified) confidence += 10;
  if (input.timestampValid === false) {
    risk += 15;
    reasons.push("timestamp-invalid");
  } else if (input.timestampValid === true) {
    confidence += 10;
  }

  // Cross-field consistency between QR and OCR (only when both sides have it).
  if (qr.amount !== undefined && ocr.amount !== undefined) {
    if (qr.amount === ocr.amount) confidence += 10;
    else {
      risk += 30;
      confidence -= 10;
      reasons.push("amount-mismatch");
    }
  }
  if (norm(qr.merchant) && norm(ocr.merchant)) {
    if (norm(qr.merchant) === norm(ocr.merchant)) confidence += 5;
    else {
      risk += 15;
      confidence -= 5;
      reasons.push("merchant-mismatch");
    }
  }
  if (normRef(qr.reference) && normRef(ocr.reference)) {
    if (normRef(qr.reference) === normRef(ocr.reference)) confidence += 5;
    else {
      risk += 20;
      confidence -= 5;
      reasons.push("reference-mismatch");
    }
  }

  risk = clamp(risk);
  return {
    authenticity: clamp(100 - risk),
    confidence: clamp(confidence),
    risk,
    reasons,
  };
}
