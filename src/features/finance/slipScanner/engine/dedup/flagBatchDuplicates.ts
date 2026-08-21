import { createDuplicateDetector } from "@/features/finance/slipScanner/engine/dedup/slipDuplicate";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// The concurrent full-gallery scan orchestrator (useFullGalleryScan) can't
// set `isDuplicate` the way the sequential picker flow (useSlipScan) does --
// its candidates arrive in whatever order the concurrent queue finishes
// them, and the exact-match detector's "seen before" answer depends on
// processing order (the first of two identical slips is never a duplicate
// of itself). Run once, after the scan settles, over the full accumulated
// batch, sorted by the one stable key every candidate carries (`assetId`),
// so the result never depends on however the scan happened to interleave --
// the same batch always flags the same slips as duplicates.
//
// Deliberately exact-match only, not the smart/perceptual-hash check
// useSlipScan.ts also runs -- that needs the original image bytes, which are
// never kept on a SlipCandidate (memory cost at full-gallery scale), so a
// post-hoc pass over already-extracted candidates cannot reproduce it.
export function flagBatchDuplicates(candidates: SlipCandidate[]): SlipCandidate[] {
  const sorted = [...candidates].sort((a, b) => a.assetId.localeCompare(b.assetId));
  const dedup = createDuplicateDetector();

  const isDuplicateById = new Map<string, boolean>();
  for (const candidate of sorted) {
    const timestamp = [candidate.date, candidate.time].filter(Boolean).join(" ") || undefined;
    const isDuplicate = dedup.markSeen({
      payload: candidate.payload,
      ref1: candidate.reference,
      amount: candidate.amount,
      bank: candidate.bankId,
      merchant: candidate.merchant,
      timestamp,
    });
    isDuplicateById.set(candidate.id, isDuplicate);
  }

  return candidates.map((candidate) => ({ ...candidate, isDuplicate: isDuplicateById.get(candidate.id) ?? candidate.isDuplicate }));
}
