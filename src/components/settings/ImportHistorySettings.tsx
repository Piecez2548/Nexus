import { useState } from "react";
import { History } from "lucide-react";

import ImportHistoryDrawer from "@/features/finance/slipScanner/components/ImportHistoryDrawer";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

// Entry point into Import History (GS-035) from Settings > Data Management —
// the destination ScanRecoveryNotice already pointed users to when it surfaced
// a failed-import notice, before this view existed.
export default function ImportHistorySettings() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <SettingsCard title={t("settings.viewImportHistory")} description={t("settings.viewImportHistoryDescription")}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <History size={18} />
        {t("settings.viewImportHistory")}
      </button>

      <ImportHistoryDrawer open={open} onClose={() => setOpen(false)} />
    </SettingsCard>
  );
}
