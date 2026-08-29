import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import { isAutoImportEligible } from "@/features/finance/slipScanner/ai/confidenceTier";
import { crc16ccitt } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";
import type { OcrTextRecognizer } from "@/features/finance/slipScanner/engine/ocr/ocrRecognizer";
import { createQrDetector } from "@/features/finance/slipScanner/engine/qr/qrDetector";
import type { QrDecoder } from "@/features/finance/slipScanner/engine/qr/qrDecoder";
import type { MediaProvider } from "@/features/finance/slipScanner/gallery/media/MediaProvider";
import { extractSlipCandidate } from "@/features/finance/slipScanner/import/extractSlipCandidate";
import { defaultSmartImportDeps } from "@/features/finance/slipScanner/import/smartImportDeps";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import type { GalleryAssetRef } from "@/features/finance/slipScanner/models/scanTypes";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { createScanSession } from "@/features/finance/slipScanner/services/scanSessionService";
import { createSlipExtractionProcessor } from "@/features/finance/slipScanner/services/slipExtractionProcessor";
import { importHistoryRepository } from "@/features/finance/slipScanner/repositories/importHistoryRepository";

// Proves the FULL intended architecture chain is actually connected, not just
// individually built: (native-shaped) Enumeration -> Scan Queue -> Cache ->
// QR Detection -> OCR Fallback -> Payload Parsing -> Confidence Scoring ->
// Duplicate Detection (both scan-time content-hash AND import-time
// ledger-conflict) -> Import Preview's auto-eligibility policy -> Transaction
// Import -> Import History. Only image decoding (QR/OCR) is faked, the same
// established pattern as orchestratedExtraction.integration.test.ts and
// pipeline.integration.test.ts (GS-021) -- everything else (the concurrent
// queue, the cache, the real confidence engine, the real conflict resolver,
// the real transactionService, the real import-history write) is production
// code, run against fake-indexeddb.
//
// This specifically exercises the orchestrator path (createScanSession),
// which is what a real native full-gallery scan would run through once
// wired -- not the separate sequential useSlipScan picker path.

function withCrc(body: string): string {
  const marked = body + "6304";
  return marked + crc16ccitt(marked).toString(16).toUpperCase().padStart(4, "0");
}

// A clean, unique PromptPay QR slip: amount 500, ref REF-CLEAN.
// "CLEAN SHOP" is 10 chars, hence tag 59's length field is "10" (not "09" as
// in the shorter "TEST SHOP" reference example elsewhere).
const CLEAN_QR = withCrc(
  "000201010211" +
    "29370016A00000067701011101130066812345678" +
    "5303764" +
    "5406500.00" +
    "5802TH" +
    "5910CLEAN SHOP" +
    "62130509REF-CLEAN",
);

class FourAssetProvider implements MediaProvider {
  readonly id = "test-orchestrated-pipeline";
  readonly capabilities = { canEnumerate: true, needsPermission: true };

  async count(): Promise<number> {
    return 4;
  }

  async *enumerate(): AsyncGenerator<GalleryAssetRef> {
    // clean: a unique, decodable QR slip -> should import as a new transaction.
    yield { assetId: "clean", capturedAt: "2026-01-01T00:00:00.000Z", bytes: 4 };
    // clean-dup: byte-for-byte identical to "clean" -> the orchestrator's own
    // content-hash dedup must skip it before it ever reaches the processor.
    yield { assetId: "clean-dup", capturedAt: "2026-01-01T00:00:01.000Z", bytes: 4 };
    // ledger-dup: OCR-only slip whose extracted fields match a transaction
    // that already exists in the ledger -> the import-time conflict resolver
    // must skip creating a duplicate transaction for it.
    yield { assetId: "ledger-dup", capturedAt: "2026-01-01T00:00:02.000Z", bytes: 4 };
    // ambiguous: OCR text with no readable amount -> "critical" confidence
    // tier, must never be auto-import-eligible (requires user confirmation).
    yield { assetId: "ambiguous", capturedAt: "2026-01-01T00:00:03.000Z", bytes: 4 };
  }

  async readBytes(asset: GalleryAssetRef): Promise<Uint8Array> {
    switch (asset.assetId) {
      case "clean":
      case "clean-dup":
        return new Uint8Array([1, 1, 1, 1]); // identical content on purpose
      case "ledger-dup":
        return new Uint8Array([2, 2, 2, 2]);
      case "ambiguous":
        return new Uint8Array([3, 3, 3, 3]);
      default:
        throw new Error(`unexpected asset ${asset.assetId}`);
    }
  }
}

const fakeDecoder: QrDecoder = {
  async decode(bytes) {
    // Only the "clean"/"clean-dup" content (first byte 1) carries a QR.
    return bytes[0] === 1 ? CLEAN_QR : null;
  },
};

const fakeRecognizer: OcrTextRecognizer = {
  async recognize(bytes) {
    if (bytes[0] === 2) {
      // Same physical slip re-scanned: matches the pre-seeded existing
      // transaction on amount, merchant, date/time AND reference. Amount +
      // merchant + timestamp alone only combine (noisy-OR, smartDuplicate.ts's
      // weights 0.3/0.3/0.4) to ~0.706 probability -- below the conflict
      // resolver's 0.85 "skip" bar (0.85 is the "reference" signal's own
      // weight) -- so the matching reference is what actually pushes this
      // over the line to ~0.94, same reasoning as smartImport.test.ts's
      // "skip near-certain duplicate" case. "ผู้รับ" is one of
      // DEFAULT_OCR_LABELS.recipient (bankTemplateRegistry.ts), which
      // slipParser.ts's labeled recipient extraction looks for.
      return "ธนาคารกสิกรไทย\nผู้รับ LEDGER SHOP\nจำนวนเงิน 250.00 บาท\nวันที่ 15/03/2569 เวลา 14:00 น.\nเลขที่รายการ OCRORIGINAL";
    }
    // "ambiguous": no amount anywhere in the text.
    return "ธนาคารกสิกรไทย\nขอบคุณที่ใช้บริการ";
  },
};

beforeEach(async () => {
  await db.slipScanRuns.clear();
  await db.slipScanCache.clear();
  await db.slipImportHistory.clear();
  await db.transactions.clear();
});

describe("full architecture chain: orchestrated scan -> transaction import -> history", () => {
  it("connects every stage end-to-end with real production code (only QR/OCR decoding faked)", async () => {
    // A transaction already in the ledger that "ledger-dup" should collide with.
    await db.transactions.add({
      title: "LEDGER SHOP",
      amount: 250,
      type: "expense",
      account: "Cash",
      date: "2026-03-15",
      time: "14:00",
      note: "KBank · OCRORIGINAL",
      status: "completed",
    });

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

    // --- Stage 1: Native-shaped Enumeration -> Scan Queue -> Cache -> QR/OCR/Parsing ---
    const run = await createScanSession({
      provider: new FourAssetProvider(),
      options: { source: "test-orchestrated-pipeline", incremental: false },
      processor,
    }).done;

    expect(run.status).toBe("completed");
    // 4 enumerated, but "clean-dup" is content-identical to "clean" -> the
    // orchestrator's own cache-backed content dedup skips one of them before
    // the processor ever runs, so only 3 candidates are actually extracted.
    // The queue is concurrent, so either asset may reserve the shared hash
    // first; the invariant is that exactly one survives, not which id wins.
    expect(run.done).toBe(3);
    expect(run.skipped).toBe(1);
    expect(candidates).toHaveLength(3);

    const cleanCandidates = candidates.filter((c) => c.assetId === "clean" || c.assetId === "clean-dup");
    expect(cleanCandidates).toHaveLength(1);
    const clean = cleanCandidates[0]!;
    const ledgerDup = candidates.find((c) => c.assetId === "ledger-dup")!;
    const ambiguous = candidates.find((c) => c.assetId === "ambiguous")!;

    // --- Stage 2: Payload Parsing sanity ---
    expect(clean.source).toBe("qr");
    expect(clean.amount).toBe(500);
    expect(clean.merchant).toBe("CLEAN SHOP");
    expect(clean.reference).toBe("REF-CLEAN");
    expect(ledgerDup.source).toBe("ocr");
    expect(ledgerDup.amount).toBe(250);
    expect(ambiguous.amount).toBeUndefined(); // OCR genuinely found no amount

    // --- Stage 3: Confidence Scoring + Import Preview's auto-eligibility policy ---
    // A clean CRC-valid QR with every field present is high confidence and
    // non-duplicate -> auto-import-eligible.
    expect(isAutoImportEligible(clean)).toBe(true);
    // Missing amount is the "critical" tier override -- never auto-eligible,
    // regardless of what else was extracted (must require user confirmation).
    expect(isAutoImportEligible(ambiguous)).toBe(false);

    // --- Stage 4: Transaction Import, with the real Import Conflict Resolver ---
    const { result } = renderHook(() => useSmartImport(defaultSmartImportDeps));
    await act(async () => {
      await result.current.importCandidates([clean, ledgerDup], {
        fallbackTitle: "Slip import",
      });
    });

    await waitFor(() => expect(result.current.result).not.toBeNull());
    const importResult = result.current.result!;

    // "clean" became a real transaction; "ledger-dup" was recognized as a
    // near-certain duplicate of the pre-seeded ledger transaction and
    // skipped -- proving no duplicate transaction was created.
    expect(importResult.importedCandidateIds).toEqual([clean.id]);
    expect(importResult.skippedDuplicates.map((s) => s.candidateId)).toEqual(["ledger-dup"]);
    expect(importResult.failed).toEqual([]);

    const allTransactions = await db.transactions.toArray();
    expect(allTransactions).toHaveLength(2); // the pre-seeded one + "clean" only
    expect(allTransactions.filter((t) => t.title === "CLEAN SHOP")).toHaveLength(1);
    expect(allTransactions.filter((t) => t.title === "LEDGER SHOP")).toHaveLength(1); // still just the original

    // --- Stage 5: Import History ---
    // useSmartImport's recordImportHistory counts a skipped near-duplicate the
    // same as a real failure for status purposes ("didn't end up as a new
    // row") -- 1 imported + 1 skipped is correctly "partial", not "success".
    const history = await importHistoryRepository.list();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ importedCount: 1, failedCount: 1, status: "partial" });
  });
});
