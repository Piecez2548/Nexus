import { useState } from "react";
import { LogIn } from "lucide-react";

import AuditLogDrawer from "@/features/security/components/AuditLogDrawer";
import { isSyncConfigured } from "@/lib/supabaseClient";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

// Entry point into a dedicated, "auth"-only view of the Audit Log — the
// underlying sign-in/sign-out/MFA events already exist (authStore.ts's own
// recordAudit calls), this just makes them discoverable without wandering
// into the generic Audit Log's full type-filter list. Only ever relevant
// when cloud sync is configured — there's no account to have a login
// history for otherwise (mirrors SyncSettings.tsx's own gating).
export default function LoginHistorySettings() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!isSyncConfigured) return null;

  return (
    <SettingsCard title={t("security.loginHistory.viewTitle")} description={t("security.loginHistory.viewDescription")}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <LogIn size={18} />
        {t("security.loginHistory.viewTitle")}
      </button>

      <AuditLogDrawer
        open={open}
        onClose={() => setOpen(false)}
        fixedType="auth"
        title={t("security.loginHistory.title")}
        description={t("security.loginHistory.subtitle")}
      />
    </SettingsCard>
  );
}
