import { useMemo, useState } from "react";

import {
  QUICK_SELECT_BANK_IDS,
  availableBanks,
  estimateScan,
  filterBanks,
  toggleBankId,
  type ScanEstimate,
} from "@/features/finance/slipScanner/selection/bankSelection";
import { useBankSelectionStore } from "@/features/finance/slipScanner/store/bankSelectionStore";
import type { BankInfo } from "@/features/finance/slipScanner/engine/bank/bankTypes";

export interface UseBankSelection {
  banks: BankInfo[]; // filtered by the current search query
  query: string;
  setQuery: (query: string) => void;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  quickSelect: () => void;
  selectedIds: string[];
  selectedCount: number;
  allSelected: boolean;
  noneSelected: boolean;
  estimate: ScanEstimate;
}

// Drives the bank-selection popup. Selection state is persisted (remembered),
// but the effective selection defaults to "all banks" until the user has ever
// made an explicit choice. All list/estimate logic comes from the pure
// bankSelection module; the component stays presentational.
export function useBankSelection(imageCount: number | null = null): UseBankSelection {
  const banks = useMemo(() => availableBanks(), []);
  const allIds = useMemo(() => banks.map((bank) => bank.id), [banks]);

  const selectedBankIds = useBankSelectionStore((state) => state.selectedBankIds);
  const chosen = useBankSelectionStore((state) => state.chosen);
  const setSelectedBankIds = useBankSelectionStore((state) => state.setSelectedBankIds);

  const [query, setQuery] = useState("");

  const effectiveIds = chosen ? selectedBankIds : allIds;
  const selectedSet = useMemo(() => new Set(effectiveIds), [effectiveIds]);
  const filtered = useMemo(() => filterBanks(banks, query), [banks, query]);
  const estimate = useMemo(() => estimateScan(imageCount), [imageCount]);

  // Count only ids that still exist as available banks (guards against a stale
  // remembered id after a bank plugin is removed).
  const selectedCount = allIds.filter((id) => selectedSet.has(id)).length;

  return {
    banks: filtered,
    query,
    setQuery,
    isSelected: (id) => selectedSet.has(id),
    toggle: (id) => setSelectedBankIds(toggleBankId(effectiveIds, id)),
    selectAll: () => setSelectedBankIds(allIds),
    deselectAll: () => setSelectedBankIds([]),
    quickSelect: () => setSelectedBankIds(allIds.filter((id) => QUICK_SELECT_BANK_IDS.includes(id))),
    selectedIds: effectiveIds,
    selectedCount,
    allSelected: selectedCount === allIds.length,
    noneSelected: selectedCount === 0,
    estimate,
  };
}
