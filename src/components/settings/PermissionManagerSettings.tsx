import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import PermissionManagerDrawer from "@/features/security/components/PermissionManagerDrawer";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

// Entry point into the Permission Manager (SEC-001) from Settings > Security & Sync.
export default function PermissionManagerSettings() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <SettingsCard title={t("security.permissionManager.viewTitle")} description={t("security.permissionManager.viewDescription")}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <ShieldCheck size={18} />
        {t("security.permissionManager.viewTitle")}
      </button>

      <PermissionManagerDrawer open={open} onClose={() => setOpen(false)} />
    </SettingsCard>
  );
}
