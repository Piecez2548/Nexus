import { getBankPlugins } from "@/features/finance/slipScanner/engine/bank/bankRegistry";
import type { BankInfo } from "@/features/finance/slipScanner/engine/bank/bankTypes";

// Pure logic for the pre-scan bank selection popup (GS-014): which banks the
// user wants imported, plus scan estimation. Kept out of React so the store,
// hook and component all share one tested implementation.

// Rough on-device per-image cost (QR decode + possible OCR), used only to show
// an estimated scan time. A heuristic, deliberately overridable — not a
// measured guarantee.
export const PER_IMAGE_SCAN_MS = 400;

// The "quick select" preset: the banks most Thai users transact with. Ids match
// the bank registry (GS-011).
export const QUICK_SELECT_BANK_IDS: readonly string[] = ["scb", "kbank", "bbl", "ktb", "promptpay"];

// The banks the user can choose from — sourced from the pluggable registry, so
// a registered bank plugin (GS-011) automatically appears here.
export function availableBanks(): BankInfo[] {
  return getBankPlugins().map((plugin) => plugin.bank);
}

// Filter by the search box: matches full name, short name, or id.
export function filterBanks(banks: BankInfo[], query: string): BankInfo[] {
  const q = query.trim().toLowerCase();
  if (q === "") return banks;
  return banks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(q) ||
      bank.shortName.toLowerCase().includes(q) ||
      bank.id.toLowerCase().includes(q),
  );
}

// Immutable toggle of one bank id within a selection.
export function toggleBankId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

export interface ScanEstimate {
  // null when the provider couldn't count the gallery ahead of time.
  imageCount: number | null;
  totalSeconds: number | null;
}

export function estimateScan(imageCount: number | null, perImageMs: number = PER_IMAGE_SCAN_MS): ScanEstimate {
  if (imageCount === null || !Number.isFinite(imageCount) || imageCount < 0) {
    return { imageCount: null, totalSeconds: null };
  }
  return { imageCount, totalSeconds: Math.round((imageCount * perImageMs) / 1000) };
}
