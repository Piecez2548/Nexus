import type { ImportHistoryEntry, ImportStatus } from "@/features/finance/slipScanner/models/importHistory";

// Pure filter + search for the Import History view (GS-035).
export interface ImportHistoryFilter {
  search?: string; // matches bank / source / amount / error text
  status?: ImportStatus | "all";
  bank?: string; // exact bank id, or omit/"all"
  from?: string; // ISO lower bound (inclusive)
  to?: string; // ISO upper bound (inclusive)
}

function searchMatches(entry: ImportHistoryEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  const haystack = [
    entry.source,
    entry.bank,
    entry.status,
    entry.amount !== undefined ? String(entry.amount) : undefined,
    ...(entry.errors ?? []),
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterImportHistory(entries: ImportHistoryEntry[], filter: ImportHistoryFilter = {}): ImportHistoryEntry[] {
  return entries.filter((entry) => {
    if (filter.status && filter.status !== "all" && entry.status !== filter.status) return false;
    if (filter.bank && filter.bank !== "all" && entry.bank !== filter.bank) return false;
    if (filter.from && entry.importedAt < filter.from) return false;
    if (filter.to && entry.importedAt > filter.to) return false;
    return searchMatches(entry, filter.search ?? "");
  });
}
