import {
  PROMPTPAY_AID_PREFIX,
  PROMPTPAY_BILLPAYMENT_AID_PREFIX,
} from "@/features/finance/slipScanner/engine/emvco/emvcoTags";
import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";

// Slip Classifier (GS-029): identify what kind of slip an image is, from the
// EMVCo AID (strongest signal) and OCR-text keywords (Thai + English). Purely
// deterministic; returns "unknown" rather than guessing when nothing matches.

export type SlipType =
  | "promptpay"
  | "bank-slip"
  | "transfer"
  | "deposit"
  | "withdrawal"
  | "bill-payment"
  | "unknown";

export interface SlipClassificationInput {
  emvco?: EmvcoPayload | null;
  bankId?: string;
  text?: string; // OCR text, if any
}

export interface SlipClassification {
  type: SlipType;
  confidence: number; // 0–1
}

export function classifySlip(input: SlipClassificationInput): SlipClassification {
  const text = input.text ?? "";
  const aid = input.emvco?.promptPay?.aid ?? "";
  const isPromptPayCredit = aid.startsWith(PROMPTPAY_AID_PREFIX);
  const isPromptPayBill = aid.startsWith(PROMPTPAY_BILLPAYMENT_AID_PREFIX);

  // Most specific first.
  if (isPromptPayBill || input.emvco?.additionalData?.billNumber !== undefined || /ชำระ|จ่ายบิล|bill\s*payment/i.test(text)) {
    return { type: "bill-payment", confidence: isPromptPayBill ? 0.95 : 0.7 };
  }
  if (/ฝากเงิน|เงินฝาก|deposit/i.test(text)) return { type: "deposit", confidence: 0.75 };
  if (/ถอนเงิน|withdraw/i.test(text)) return { type: "withdrawal", confidence: 0.75 };
  if (isPromptPayCredit) return { type: "promptpay", confidence: 0.9 };
  if (/โอนเงิน|transfer/i.test(text)) return { type: "transfer", confidence: 0.75 };
  if (input.bankId) return { type: "bank-slip", confidence: 0.6 };
  return { type: "unknown", confidence: 0 };
}
