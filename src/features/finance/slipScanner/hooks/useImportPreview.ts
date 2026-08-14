import { useMemo, useState } from "react";

import { isAutoImportEligible } from "@/features/finance/slipScanner/ai/confidenceTier";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { filterCandidates, type DuplicateFilter } from "@/features/finance/slipScanner/preview/importPreview";

export interface UseImportPreview {
  visible: SlipCandidate[];
  search: string;
  setSearch: (search: string) => void;
  duplicateFilter: DuplicateFilter;
  setDuplicateFilter: (filter: DuplicateFilter) => void;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAllVisible: () => void;
  deselectAll: () => void;
  allVisibleSelected: boolean;
  selectedCandidates: SlipCandidate[];
  selectedCount: number;
}

// Default to importing only what's auto-import-eligible: high-confidence,
// non-duplicate, with its critical fields present (confidence tier policy,
// Section 9 of the Slip Intelligence review). A duplicate, a missing amount,
// or merely medium/low confidence starts unchecked so a careless "Import
// Selected" doesn't wave through something that needed a look first.
function defaultSelection(candidates: SlipCandidate[]): Set<string> {
  return new Set(candidates.filter((c) => isAutoImportEligible(c)).map((c) => c.id));
}

// Drives the Import Preview: search, duplicate filter, and per-row selection.
// Selection resets to the sensible default whenever the candidate set changes
// (a new scan), but is preserved across search/filter changes within one set.
export function useImportPreview(candidates: SlipCandidate[]): UseImportPreview {
  const [search, setSearch] = useState("");
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => defaultSelection(candidates));

  // Reset selection to the default when the candidate set changes (a new scan),
  // using React's "adjust state during render" pattern — preferred over an
  // effect, and preserves selection across search/filter changes within one set.
  const signature = candidates.map((c) => c.id).join(",");
  const [prevSignature, setPrevSignature] = useState(signature);
  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setSelectedIds(defaultSelection(candidates));
  }

  const visible = useMemo(
    () => filterCandidates(candidates, { search, duplicate: duplicateFilter }),
    [candidates, search, duplicateFilter],
  );

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => selectedIds.has(c.id)),
    [candidates, selectedIds],
  );

  return {
    visible,
    search,
    setSearch,
    duplicateFilter,
    setDuplicateFilter,
    isSelected: (id) => selectedIds.has(id),
    toggle: (id) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    selectAllVisible: () =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of visible) next.add(c.id);
        return next;
      }),
    deselectAll: () => setSelectedIds(new Set()),
    allVisibleSelected: visible.length > 0 && visible.every((c) => selectedIds.has(c.id)),
    selectedCandidates,
    selectedCount: selectedCandidates.length,
  };
}
