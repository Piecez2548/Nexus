import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

// Pure filtering/search for the Import Preview list, shared by the hook and
// tests. No React, no selection state (the hook owns that).

export type DuplicateFilter = "all" | "unique" | "duplicates";

export interface PreviewFilter {
  search: string;
  duplicate: DuplicateFilter;
  bankId?: string; // when set, only this bank's candidates
}

// Match a candidate against a free-text query over merchant, reference, bank
// and amount.
export function searchMatches(candidate: SlipCandidate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;

  const haystack = [
    candidate.merchant,
    candidate.reference,
    candidate.bankName,
    candidate.bankId,
    candidate.amount !== undefined ? String(candidate.amount) : undefined,
  ]
    .filter((v): v is string => v !== undefined)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function filterCandidates(candidates: SlipCandidate[], filter: PreviewFilter): SlipCandidate[] {
  return candidates.filter((candidate) => {
    if (filter.duplicate === "unique" && candidate.isDuplicate) return false;
    if (filter.duplicate === "duplicates" && !candidate.isDuplicate) return false;
    if (filter.bankId !== undefined && candidate.bankId !== filter.bankId) return false;
    return searchMatches(candidate, filter.search);
  });
}
