import { useEffect, useMemo, useState } from "react";

import { auditLogRepository } from "@/features/security/auditLogRepository";
import type { AuditEventType, AuditLogRow } from "@/features/security/auditLog";

export type AuditLogTypeFilter = AuditEventType | "all";

export interface UseAuditLog {
  entries: AuditLogRow[];
  visible: AuditLogRow[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  typeFilter: AuditLogTypeFilter;
  setTypeFilter: (type: AuditLogTypeFilter) => void;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
}

// Drives the Audit Log view (SEC-002): loads every persisted security event
// on mount, with a search (over the action string) + type filter over it.
// Mirrors useImportHistory.ts's shape.
export function useAuditLog(): UseAuditLog {
  const [entries, setEntries] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AuditLogTypeFilter>("all");

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setEntries(await auditLogRepository.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function clear(): Promise<void> {
    await auditLogRepository.clear();
    setEntries([]);
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (query && !entry.action.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [entries, search, typeFilter]);

  return { entries, visible, loading, search, setSearch, typeFilter, setTypeFilter, reload, clear };
}
