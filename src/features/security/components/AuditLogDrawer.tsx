import {
  ShieldAlert,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Download,
  Search,
  LogIn,
  Lock,
  KeyRound,
  Archive,
  type LucideIcon,
} from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { useAuditLog, type AuditLogTypeFilter } from "@/features/security/useAuditLog";
import type { AuditEventType, AuditLogRow } from "@/features/security/auditLog";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  open: boolean;
  onClose: () => void;
  // When set, locks the view to this one event type and hides the
  // type-filter chip row entirely -- used by LoginHistorySettings so the
  // view reads as its own dedicated screen, not "the audit log with a chip
  // pre-clicked" (a person could otherwise wander back into "all").
  fixedType?: AuditEventType;
  title?: string;
  description?: string;
}

const TYPE_FILTERS: AuditLogTypeFilter[] = [
  "all",
  "auth",
  "encryption",
  "lock",
  "vault",
  "backup",
  "permission",
  "import",
  "delete",
  "validation",
  "suspicious",
];

const TYPE_LABEL_KEY: Record<AuditLogTypeFilter, string> = {
  all: "security.auditLog.filterAll",
  auth: "security.auditLog.typeAuth",
  encryption: "security.auditLog.typeEncryption",
  lock: "security.auditLog.typeLock",
  vault: "security.auditLog.typeVault",
  backup: "security.auditLog.typeBackup",
  permission: "security.auditLog.typePermission",
  import: "security.auditLog.typeImport",
  scan: "security.auditLog.typeScan",
  delete: "security.auditLog.typeDelete",
  validation: "security.auditLog.typeValidation",
  suspicious: "security.auditLog.typeSuspicious",
};

const TYPE_ICON: Record<AuditEventType, LucideIcon> = {
  auth: LogIn,
  encryption: Lock,
  lock: KeyRound,
  vault: Archive,
  backup: Download,
  permission: ShieldCheck,
  import: Download,
  scan: Search,
  delete: Trash2,
  validation: AlertTriangle,
  suspicious: ShieldAlert,
};

const TYPE_CLASSES: Record<AuditEventType, string> = {
  auth: "text-blue-600 dark:text-blue-400",
  encryption: "text-emerald-600 dark:text-emerald-400",
  lock: "text-emerald-600 dark:text-emerald-400",
  vault: "text-brand-600 dark:text-brand-400",
  backup: "text-zinc-600 dark:text-zinc-400",
  permission: "text-zinc-600 dark:text-zinc-400",
  import: "text-zinc-600 dark:text-zinc-400",
  scan: "text-zinc-600 dark:text-zinc-400",
  delete: "text-zinc-600 dark:text-zinc-400",
  validation: "text-amber-600 dark:text-amber-400",
  suspicious: "text-red-600 dark:text-red-400",
};

function formatEntry(entry: AuditLogRow): string {
  return new Date(entry.at).toLocaleString();
}

function formatDetail(detail: AuditLogRow["detail"]): string | null {
  if (!detail) return null;
  return Object.entries(detail)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

// Audit Log (SEC-002): every persisted security event on this device, with
// search + type filter. Read-only log, mirrors ImportHistoryDrawer.tsx.
export default function AuditLogDrawer({ open, onClose, fixedType, title, description }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const log = useAuditLog(fixedType);

  async function handleClear(): Promise<void> {
    if (!window.confirm(t("security.auditLog.clearConfirm"))) return;
    await log.clear();
    toast.success(t("security.auditLog.cleared"));
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div>
          <h2 className="text-xl font-bold">{title ?? t("security.auditLog.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description ?? t("security.auditLog.subtitle")}</p>
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={log.search}
            onChange={(e) => log.setSearch(e.target.value)}
            placeholder={t("security.auditLog.searchPlaceholder")}
            aria-label={t("security.auditLog.searchPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        {!fixedType && (
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("security.auditLog.filterAll")}>
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => log.setTypeFilter(filter)}
              aria-pressed={log.typeFilter === filter}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                log.typeFilter === filter
                  ? "bg-brand-600 text-white"
                  : "border border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
              }`}
            >
              {t(TYPE_LABEL_KEY[filter])}
            </button>
          ))}
        </div>
        )}

        {log.visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("security.auditLog.empty")}
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {log.visible.map((entry) => {
              const Icon = TYPE_ICON[entry.type];
              const detailText = formatDetail(entry.detail);
              return (
                <li key={entry.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={TYPE_CLASSES[entry.type]} />
                    <span className="font-medium">{entry.action}</span>
                    <span className="ml-auto text-xs text-zinc-400">{formatEntry(entry)}</span>
                  </div>
                  {detailText && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detailText}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={handleClear}
          disabled={log.entries.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 size={16} />
          {t("security.auditLog.clear")}
        </button>
      </div>
    </Drawer>
  );
}
