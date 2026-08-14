import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import type { ScanCache } from "@/features/finance/slipScanner/cache/scanCache";
import { crc16ccitt } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";
import type { OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import { createQrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import { extractSlipCandidate } from "@/features/finance/slipScanner/import/extractSlipCandidate";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { createSlipExtractionProcessor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";
import { createScanSession } from "@/features/finance/slipScanner/services/scanSessionService";

// Proves the scan orchestration (GS-006/007/008 -- concurrent queue, byte
// budget, cache, pause/resume/cancel) can actually drive the real extraction
// pipeline (GS-009..012 -- QR detect -> EMVCo parse -> bank identify -> OCR
// fallback), end to end. Before this, the two had only ever been exercised
// separately: pipeline.integration.test.ts drives extraction alone with a
// simple loop, and scanSession.stress.test.ts drives orchestration alone with
// a no-op processor. Only image decoding (QR/OCR) is faked here -- everything
// else (queue, retry, cache decisions, extraction, parsing, bank ID) is real.

function withCrc(body: string): string {
  const marked = body + "6304";
  return marked + crc16ccitt(marked).toString(16).toUpperCase().padStart(4, "0");
}

const PROMPTPAY_QR = withCrc(
  "000201010211" +
    "29370016A00000067701011101130066812345678" +
    "5303764" +
    "5406250.00" +
    "5802TH" +
    "5909TEST SHOP" +
    "62090505REF99",
);

// Two assets: one with a decodable QR (bytes[0] === 1), one without (falls
// back to OCR, bytes[0] === 0) -- distinguished the same way the existing
// extractSlipCandidate tests fake a decoder.
class TwoAssetProvider implements MediaProvider {
  readonly id = "test-two-asset";
  readonly capabilities = { canEnumerate: true, needsPermission: false };

  async count(): Promise<number> {
    return 2;
  }

  async *enumerate(): AsyncGenerator<GalleryAssetRef> {
    yield { assetId: "slip-qr", capturedAt: "2026-01-01T00:00:00.000Z", bytes: 4 };
    yield { assetId: "slip-ocr", capturedAt: "2026-01-01T00:00:01.000Z", bytes: 4 };
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    return asset.assetId === "slip-qr" ? new Uint8Array([1]) : new Uint8Array([0]);
  }
}

const fakeDecoder: QrDecoder = {
  async decode(bytes) {
    return bytes[0] === 1 ? PROMPTPAY_QR : null;
  },
};

const fakeRecognizer: OcrTextRecognizer = {
  async recognize() {
    return "ธนาคารกสิกรไทย\nจำนวนเงิน 45.00 บาท\nวันที่ 12/05/2567 เวลา 09:30 น.";
  },
};

function memoryCache(): ScanCache {
  return {
    async decide() {
      return "scan";
    },
    async hasContent() {
      return false;
    },
    async recordScanned() {},
    async recordFailed() {},
    async invalidate() {},
    async clear() {},
  };
}

beforeEach(async () => {
  await db.slipScanRuns.clear();
});

describe("orchestrated extraction (scan session drives the real pipeline)", () => {
  it("runs real QR/EMVCo/bank/OCR extraction for every asset the queue processes", async () => {
    const candidates: SlipCandidate[] = [];
    const processor = createSlipExtractionProcessor(
      (_asset, candidate) => {
        candidates.push(candidate);
      },
      (input) =>
        extractSlipCandidate({
          ...input,
          detector: createQrDetector(fakeDecoder),
          recognizer: fakeRecognizer,
        }),
    );

    const run = await createScanSession({
      provider: new TwoAssetProvider(),
      options: { source: "test-two-asset", incremental: false },
      cache: memoryCache(),
      processor,
    }).done;

    expect(run.status).toBe("completed");
    expect(run.done).toBe(2);
    expect(candidates).toHaveLength(2);

    const qrCandidate = candidates.find((c) => c.source === "qr");
    expect(qrCandidate?.amount).toBe(250);
    expect(qrCandidate?.merchant).toBe("TEST SHOP");
    expect(qrCandidate?.reference).toBe("REF99");

    const ocrCandidate = candidates.find((c) => c.source === "ocr");
    expect(ocrCandidate?.amount).toBe(45);
    expect(ocrCandidate?.bankId).toBe("kbank");
    expect(ocrCandidate?.date).toBe("2024-05-12");
  });

  it("keeps the queue's bounded retry, and the run still completes, when extraction fails", async () => {
    let attempts = 0;
    const processor = createSlipExtractionProcessor(
      () => {},
      async () => {
        attempts++;
        throw new Error("boom");
      },
    );

    const run = await createScanSession({
      provider: new TwoAssetProvider(),
      options: { source: "test-two-asset", incremental: false, maxRetries: 1, retryDelayMs: 0 },
      cache: memoryCache(),
      processor,
    }).done;

    expect(run.status).toBe("completed");
    expect(run.failed).toBe(2);
    // 1 initial attempt + 1 retry, for each of the 2 assets.
    expect(attempts).toBe(4);
  });
});
