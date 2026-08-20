import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldOff, Lock, KeyRound } from "lucide-react";

import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import Drawer from "@/components/ui/Drawer";
import EnableEncryptionForm from "@/features/encryption/components/EnableEncryptionForm";
import ReescrowDekForm from "@/features/encryption/components/ReescrowDekForm";
import DisableEncryptionForm from "@/features/encryption/components/DisableEncryptionForm";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

export default function EncryptionSettings() {
  const isPinEnabled = useAppLockStore((s) => s.isEnabled());
  const encryptionEnabled = useAppLockStore((s) => s.encryptionEnabled);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reescrowOpen, setReescrowOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  return (
    <SettingsCard title={t("settings.encryptionTitle")} description={t("settings.encryptionDescription")}>
      {encryptionEnabled ? (
        <>
          <div className="flex items-center gap-2 text-sm text-green-500">
            <ShieldCheck size={16} />
            {t("settings.encryptionEnabledStatus")}
          </div>

          <button
            type="button"
            onClick={() => setReescrowOpen(true)}
            className="flex items-center gap-2 text-sm text-brand-600 hover:underline dark:text-brand-400"
          >
            <KeyRound size={14} />
            {t("settings.encryptionReescrowButton")}
          </button>

          <button
            type="button"
            onClick={() => setDisableOpen(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:underline"
          >
            <ShieldOff size={14} />
            {t("settings.encryptionDisableButton")}
          </button>
        </>
      ) : !isSyncConfigured || !user ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <ShieldAlert size={16} />
          {t("settings.encryptionNeedsSignIn")}
        </div>
      ) : !isPinEnabled ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <ShieldAlert size={16} />
          {t("settings.encryptionNeedsPin")}
        </div>
      ) : (
        <>
          <p className="text-sm text-amber-600 dark:text-amber-400">{t("settings.encryptionRolloutWarning")}</p>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700"
          >
            <Lock size={16} />
            {t("settings.encryptionEnableButton")}
          </button>
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <EnableEncryptionForm onDone={() => setDrawerOpen(false)} />
      </Drawer>

      <Drawer open={reescrowOpen} onClose={() => setReescrowOpen(false)}>
        <ReescrowDekForm onDone={() => setReescrowOpen(false)} />
      </Drawer>

      <Drawer open={disableOpen} onClose={() => setDisableOpen(false)}>
        <DisableEncryptionForm onDone={() => setDisableOpen(false)} />
      </Drawer>
    </SettingsCard>
  );
}
