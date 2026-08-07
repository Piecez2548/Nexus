import { describe, expect, it } from "vitest";

import { identifyBank } from "@/features/finance/slipScanner/engine/bank/bankIdentifier";
import { parseEmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { crc16ccitt } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";
import { shouldRunOcrFallback } from "@/features/finance/slipScanner/engine/ocr/ocrFallback";
import { extractOcrSlipFields } from "@/features/finance/slipScanner/engine/ocr/slipOcrFields";
import { createQrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";
import { createDuplicateDetector } from "@/features/finance/slipScanner/engine/dedup/slipDuplicate";
import { buildSlipCandidate, type SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { rollbackImport, runSmartImport, type SmartImportDeps } from "@/features/finance/slipScanner/import/smartImport";
import { validateSlipCandidate } from "@/features/finance/slipScanner/validation/slipValidation";

// End-to-end critical-path integration (GS-021): compose the real engine stages
// — QR detect → EMVCo parse → bank identify → OCR fallback → candidate build →
// duplicate detect → validate → smart import — with only the outermost I/O
// (image decoding + persistence) faked. Proves the pieces built across
// GS-009…GS-019 actually fit together, not just in isolation.

function withCrc(body: string): string {
  const marked = body + "6304";
  return marked + crc16ccitt(marked).toString(16).toUpperCase().padStart(4, "0");
}

// A valid static PromptPay QR: mobile proxy, amount 120.00 THB, reference REF77.
const PROMPTPAY_QR = withCrc(
  "000201010211" +
    "29370016A00000067701011101130066812345678" +
    "5303764" +
    "5406120.00" +
    "5802TH" +
    "5909TEST SHOP" +
    "62090505REF77",
);

// A fake decoder: returns the QR payload for the "slip" bytes (first byte 1),
// and null for a plain photo (first byte 0).
const fakeDecoder: QrDecoder = {
  async decode(bytes) {
    return bytes[0] === 1 ? PROMPTPAY_QR : null;
  },
};

// Compose the extraction pipeline for one asset's bytes into a SlipCandidate.
async function extract(assetId: string, bytes: Uint8Array): Promise<SlipCandidate> {
  const detector = createQrDetector(fakeDecoder);
  const detection = await detector.detect(bytes);
  const emvco = detection.payload !== null ? parseEmvcoPayload(detection.payload) : null;
  const bank = emvco ? identifyBank(emvco) : null;

  const qr = { hasQr: detection.hasQr, emvco };
  const ocr = shouldRunOcrFallback(qr)
    ? extractOcrSlipFields("จำนวน 89.00 บาท\nวันที่ 12/05/2567 เวลา 10:15 น.\nเลขที่รายการ OCRREF001")
    : null;

  return buildSlipCandidate({ assetId, emvco, bank, ocr });
}

function fakeDeps() {
  const deleted: number[] = [];
  let nextId = 1;
  const deps: SmartImportDeps = {
    createTransaction: async () => nextId++,
    deleteTransaction: async (id) => void deleted.push(id),
  };
  return { deps, deleted };
}

describe("slip scanner pipeline (integration)", () => {
  it("extracts a QR slip via the EMVCo path and identifies the rail", async () => {
    const candidate = await extract("slip1", new Uint8Array([1, 1, 1]));
    expect(candidate.source).toBe("qr");
    expect(candidate.amount).toBe(120);
    expect(candidate.currency).toBe("THB");
    expect(candidate.merchant).toBe("TEST SHOP");
    expect(candidate.reference).toBe("REF77");
    expect(candidate.bankId).toBe("promptpay");
    expect(validateSlipCandidate(candidate, { today: () => "2026-01-01" }).valid).toBe(true);
  });

  it("falls back to OCR for a non-QR photo", async () => {
    const candidate = await extract("photo1", new Uint8Array([0, 0, 0]));
    expect(candidate.source).toBe("ocr");
    expect(candidate.amount).toBe(89);
    expect(candidate.time).toBe("10:15");
    expect(candidate.reference).toBe("OCRREF001");
  });

  it("detects a re-scanned duplicate and imports only the unique slips, with rollback", async () => {
    const first = await extract("slip1", new Uint8Array([1, 1, 1]));
    const second = await extract("slip2", new Uint8Array([1, 1, 1])); // same slip content

    const dedup = createDuplicateDetector();
    const firstDup = dedup.markSeen({ payload: first.payload, ref1: first.reference, amount: first.amount, bank: first.bankId });
    const secondDup = dedup.markSeen({ payload: second.payload, ref1: second.reference, amount: second.amount, bank: second.bankId });
    expect(firstDup).toBe(false);
    expect(secondDup).toBe(true);

    const candidates: SlipCandidate[] = [first, { ...second, isDuplicate: secondDup }];
    // Only import the non-duplicates (mirrors the preview's default selection).
    const toImport = candidates.filter((c) => !c.isDuplicate);

    const { deps, deleted } = fakeDeps();
    const result = await runSmartImport(toImport, deps);
    expect(result.status).toBe("completed");
    expect(result.importedIds).toHaveLength(1);
    expect(result.failed).toEqual([]);

    // Rollback undoes the whole run.
    expect(await rollbackImport(result.importedIds, deps)).toBe(1);
    expect(deleted).toEqual(result.importedIds);
  });
});
