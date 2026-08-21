import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, KeyRound } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { getVerifiedTotpFactor } from "@/features/sync/mfa";
import { countRemainingBackupCodes } from "@/features/sync/backupCodes";
import EnrollMfaForm from "@/features/sync/components/EnrollMfaForm";
import DisableMfaForm from "@/features/sync/components/DisableMfaForm";
import RegenerateBackupCodesForm from "@/features/sync/components/RegenerateBackupCodesForm";
import Drawer from "@/components/ui/Drawer";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

const BACKUP_CODE_COUNT = 10;

type DrawerContent = "enroll" | "disable" | "regenerate" | null;

// Only rendered once signed in -- 2FA applies to the optional Supabase
// cloud-sync account (Layer 2), not the device-local PIN/biometric App
// Lock (SecuritySettings.tsx), which is unrelated to this card entirely.
export default function MfaSettings() {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [codesRemaining, setCodesRemaining] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const factor = await getVerifiedTotpFactor();
    setFactorId(factor?.id ?? null);
    setCodesRemaining(factor ? await countRemainingBackupCodes(user.id) : null);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleDone() {
    setDrawerContent(null);
    void refresh();
  }

  if (!user) return null;

  return (
    <SettingsCard title={t("mfa.settingsTitle")} description={t("mfa.settingsDescription")}>
      {!factorId ? (
        <button
          type="button"
          onClick={() => setDrawerContent("enroll")}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700"
        >
          <ShieldCheck size={16} />
          {t("mfa.enableButton")}
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-green-500">
            <ShieldCheck size={16} />
            {t("mfa.enabledStatus")}
          </div>

          {codesRemaining !== null && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("mfa.codesRemaining", { count: codesRemaining, total: BACKUP_CODE_COUNT })}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDrawerContent("regenerate")}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <KeyRound size={20} className="text-brand-500" />
              <span className="text-sm font-medium">{t("mfa.regenerateButton")}</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerContent("disable")}
              className="flex flex-col items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 transition hover:bg-red-500/20"
            >
              <ShieldOff size={20} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">{t("mfa.disableButton")}</span>
            </button>
          </div>
        </>
      )}

      <Drawer open={drawerContent !== null} onClose={() => setDrawerContent(null)}>
        {drawerContent === "enroll" && <EnrollMfaForm onDone={handleDone} />}
        {drawerContent === "disable" && factorId && <DisableMfaForm factorId={factorId} onDone={handleDone} />}
        {drawerContent === "regenerate" && factorId && <RegenerateBackupCodesForm factorId={factorId} onDone={handleDone} />}
      </Drawer>
    </SettingsCard>
  );
}
