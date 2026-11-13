import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// The review queue holds slips waiting for a person to confirm. A finished
// scan adds to it instead of replacing it: an automatic scan that finds
// nothing new must not drop slips restored from an earlier scan. A candidate
// for an image already in the queue replaces the older one, because a
// re-scan (after an OCR or parser fix) reads it better.
export function mergeReviewQueue(pending: readonly SlipCandidate[], incoming: readonly SlipCandidate[]): SlipCandidate[] {
  if (incoming.length === 0) return [...pending];
  const incomingIds = new Set(incoming.map((candidate) => candidate.id));
  const incomingAssets = new Set(incoming.map((candidate) => candidate.assetId));
  return [
    ...pending.filter((candidate) => !incomingIds.has(candidate.id) && !incomingAssets.has(candidate.assetId)),
    ...incoming,
  ];
}

// Keeps only the newest candidate per gallery image across stored runs, so a
// slip re-scanned in a later run is not listed twice (old reading and new).
export function latestCandidatePerAsset(rows: readonly { runId: number; candidate: SlipCandidate }[]): SlipCandidate[] {
  const latest = new Map<string, { runId: number; candidate: SlipCandidate }>();
  for (const row of rows) {
    const current = latest.get(row.candidate.assetId);
    if (!current || row.runId >= current.runId) latest.set(row.candidate.assetId, row);
  }
  return [...latest.values()].map((row) => row.candidate);
}
