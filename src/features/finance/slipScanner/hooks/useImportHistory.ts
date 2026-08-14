import { useEffect, useMemo, useState } from "react";

import type { ImportHistoryEntry, ImportStatus } from "@/features/finance/slipScanner/models/importHistory";
import { importHistoryRepository } from "@/features/finance/slipScanner/repositories/importHistoryRepository";
import { filterImportHistory } from "@/features/finance/slipScanner/history/importHistoryFilter";

export type ImportHistoryStatusFilter = ImportStatus | "all";

export interface UseImportHistory {
  entries: ImportHistoryEntry[];
  visible: ImportHistoryEntry[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  statusFilter: ImportHistoryStatusFilter;
  setStatusFilter: (status: ImportHistoryStatusFilter) => void;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
}

// Drives the Import History view (GS-035): loads every Smart Import run from
// the local log on mount, with a search + status filter over it (pure logic
// already existed in filterImportHistory — this is its first production
// caller). `reload`/`clear` are exposed so the Drawer can refresh after the
// user clears the log, and so a future "record on import" caller can trigger
// a refresh if the drawer happens to be open at the time.
export function useImportHistory(): UseImportHistory {
  const [entries, setEntries] = useState<ImportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ImportHistoryStatusFilter>("all");

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setEntries(await importHistoryRepository.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function clear(): Promise<void> {
    await importHistoryRepository.clear();
    setEntries([]);
  }

  const visible = useMemo(
    () => filterImportHistory(entries, { search, status: statusFilter }),
    [entries, search, statusFilter],
  );

  return { entries, visible, loading, search, setSearch, statusFilter, setStatusFilter, reload, clear };
}
