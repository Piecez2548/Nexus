import { useMemo, useState } from "react";

import { isAutoImportEligible } from "@/features/finance/slipScanner/ai/confidenceTier";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { filterCandidates, type DuplicateFilter } from "@/features/finance/slipScanner/preview/importPreview";

// The fields a person can correct in the Review Queue before import — a
// deliberately small set (not the whole candidate): the ones a QR/OCR misread
// or a wrong auto-category guess actually affects.
export type CandidateEdit = Partial<Pick<SlipCandidate, "amount" | "merchant" | "category" | "date">>;

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
  // Review Queue field edits, applied on top of the original extraction.
  editingId: string | null;
  startEdit: (id: string | null) => void;
  applyEdit: (id: string, patch: CandidateEdit) => void;
  editsFor: (id: string) => CandidateEdit | undefined;
}

// Default to importing only what's auto-import-eligible: high-confidence,
// non-duplicate, with its critical fields present (confidence tier policy,
// Section 9 of the Slip Intelligence review). A duplicate, a missing amount,
// or merely medium/low confidence starts unchecked so a careless "Import
// Selected" doesn't wave through something that needed a look first.
function defaultSelection(candidates: SlipCandidate[]): Set<string> {
  return new Set(candidates.filter((c) => isAutoImportEligible(c)).map((c) => c.id));
}

// Drives the Import Preview / Review Queue: search, duplicate filter,
// per-row selection, and per-row field edits. Selection and edits reset to
// their defaults whenever the candidate set changes (a new scan), but persist
// across search/filter changes within one set.
export function useImportPreview(candidates: SlipCandidate[]): UseImportPreview {
  const [search, setSearch] = useState("");
  const [duplicateFilter, setDuplicateFilter] = useState<DuplicateFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => defaultSelection(candidates));
  const [edits, setEdits] = useState<Map<string, CandidateEdit>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reset selection/edits to the default when the candidate set changes (a new
  // scan), using React's "adjust state during render" pattern — preferred over
  // an effect, and preserves state across search/filter changes within one set.
  const signature = candidates.map((c) => c.id).join(",");
  const [prevSignature, setPrevSignature] = useState(signature);
  if (signature !== prevSignature) {
    setPrevSignature(signature);
    setSelectedIds(defaultSelection(candidates));
    setEdits(new Map());
    setEditingId(null);
  }

  const edited = useMemo(
    () => candidates.map((c) => (edits.has(c.id) ? { ...c, ...edits.get(c.id) } : c)),
    [candidates, edits],
  );

  const visible = useMemo(
    () => filterCandidates(edited, { search, duplicate: duplicateFilter }),
    [edited, search, duplicateFilter],
  );

  const selectedCandidates = useMemo(
    () => edited.filter((c) => selectedIds.has(c.id)),
    [edited, selectedIds],
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
    editingId,
    startEdit: setEditingId,
    applyEdit: (id, patch) =>
      setEdits((prev) => {
        const next = new Map(prev);
        next.set(id, { ...next.get(id), ...patch });
        return next;
      }),
    editsFor: (id) => edits.get(id),
  };
}
