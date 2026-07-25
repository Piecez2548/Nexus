import { useState } from "react";
import { Lock, ShieldCheck, KeyRound, ShieldOff } from "lucide-react";

import { useAppLockStore } from "@/store/appLockStore";
import Drawer from "@/components/ui/Drawer";
import AppLockScreen from "@/features/lock/components/AppLockScreen";
import ChangePinForm from "@/features/lock/components/ChangePinForm";
import DisableLockForm from "@/features/lock/components/DisableLockForm";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

type DrawerContent = "setup" | "change" | "disable" | null;

export default function SecuritySettings() {
  const isEnabled = useAppLockStore((s) => s.isEnabled());
  const autoLockMinutes = useAppLockStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useAppLockStore((s) => s.setAutoLockMinutes);
  const lock = useAppLockStore((s) => s.lock);
  const { t } = useTranslation();

  const AUTO_LOCK_OPTIONS = [
    { value: 0, label: t("settings.autoLockNever") },
    { value: 5, label: t("settings.autoLockMinutes", { count: 5 }) },
    { value: 15, label: t("settings.autoLockMinutes", { count: 15 }) },
    { value: 30, label: t("settings.autoLockMinutes", { count: 30 }) },
    { value: 60, label: t("settings.autoLockHour") },
  ];

  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);

  return (
    <SettingsCard
      title={t("settings.security")}
      description={t("settings.securityDescription")}
    >
      {!isEnabled ? (
        <button
          type="button"
          onClick={() => setDrawerContent("setup")}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-white transition hover:bg-violet-700"
        >
          <Lock size={16} />
          {t("settings.enableAppLock")}
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-green-500">
            <ShieldCheck size={16} />
            {t("settings.appLockEnabled")}
          </div>

          <div>
            <label htmlFor="auto-lock-minutes" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-400">
              {t("settings.autoLockLabel")}
            </label>
            <select
              id="auto-lock-minutes"
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500"
            >
              {AUTO_LOCK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={lock}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Lock size={20} className="text-violet-500" />
              <span className="text-sm font-medium">{t("settings.lockNow")}</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerContent("change")}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <KeyRound size={20} className="text-violet-500" />
              <span className="text-sm font-medium">{t("settings.changePin")}</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerContent("disable")}
              className="flex flex-col items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 transition hover:bg-red-500/20"
            >
              <ShieldOff size={20} className="text-red-500" />
              <span className="text-sm font-medium text-red-500">{t("settings.disable")}</span>
            </button>
          </div>
        </>
      )}

      <Drawer open={drawerContent !== null} onClose={() => setDrawerContent(null)}>
        {drawerContent === "setup" && (
          <AppLockScreen mode="setup" onDone={() => setDrawerContent(null)} />
        )}
        {drawerContent === "change" && (
          <ChangePinForm onDone={() => setDrawerContent(null)} />
        )}
        {drawerContent === "disable" && (
          <DisableLockForm onDone={() => setDrawerContent(null)} />
        )}
      </Drawer>
    </SettingsCard>
  );
}
