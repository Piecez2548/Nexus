import { getBankPlugins } from "@/features/finance/slipScanner/engine/bank/bankRegistry";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { bankIdForPackage } from "../engine/bankPackageRegistry";
import { parseNotificationText } from "../engine/notificationTextParser";
import type { RawPendingNotification } from "../native/notificationCapturePlugin";

// Turns a raw stashed notification into a SlipCandidate ready for the
// one-tap confirm sheet. Direct construction, not buildSlipCandidate.ts --
// that function only accepts {emvco, bank, ocr}, an image-extraction shape;
// a notification has none of those (no QR, no OCR, no image).
//
// Returns null when no amount could be parsed: a candidate with no amount
// can never be imported anyway (runSmartImport hard-rejects it regardless of
// confidence), so it should never even reach the confirm sheet. Filtering
// here, at the source, means every caller gets that guarantee for free
// instead of having to remember to check.
export function buildNotificationCandidate(raw: RawPendingNotification): SlipCandidate | null {
  const text = [raw.title, raw.bigText || raw.text].filter(Boolean).join("\n");
  const { amount, counterparty } = parseNotificationText(text);
  if (amount === undefined) return null;

  const bankId = bankIdForPackage(raw.packageName);
  const bank = bankId ? getBankPlugins().find((p) => p.bank.id === bankId)?.bank : undefined;

  return {
    id: `notification:${raw.id}`,
    assetId: `notification:${raw.id}`,
    bankId: bank?.id,
    bankName: bank?.shortName,
    amount,
    merchant: counterparty,
    source: "notification",
    isDuplicate: false,
    // Bank identified via package name (more reliable than OCR-text
    // matching, since we know exactly which app posted it) plus a parsed
    // amount is a strong signal; slightly lower when the bank couldn't be
    // resolved from the package name, but still worth surfacing for confirm.
    confidence: bank ? 90 : 70,
  };
}
