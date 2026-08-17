import { useState } from "react";
import { ScrollText } from "lucide-react";

import AuditLogDrawer from "@/features/security/components/AuditLogDrawer";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

// Entry point into the Audit Log (SEC-002) from Settings > Security & Sync.
export default function AuditLogSettings() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <SettingsCard title={t("security.auditLog.viewTitle")} description={t("security.auditLog.viewDescription")}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <ScrollText size={18} />
        {t("security.auditLog.viewTitle")}
      </button>

      <AuditLogDrawer open={open} onClose={() => setOpen(false)} />
    </SettingsCard>
  );
}
