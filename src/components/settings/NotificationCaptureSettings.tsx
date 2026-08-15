import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import { PaymentNotificationCapture } from "@/features/finance/notificationCapture/native/notificationCapturePlugin";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

// Payment Notification Capture (Phase 1): opt-in toggle, gated on Android's
// special "Notification access" grant -- unlike a normal runtime permission,
// there's no in-app request dialog for it at all (see
// PaymentNotificationCapturePlugin.openAccessSettings), so this mirrors
// useGalleryPermission.ts's denied -> "open Settings" -> recheck-on-resume
// shape, minus the initial in-app request step that simply doesn't exist
// for this permission category.
export default function NotificationCaptureSettings() {
  const { t } = useTranslation();
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);

  async function refresh(): Promise<void> {
    const [access, capture] = await Promise.all([PaymentNotificationCapture.checkAccess(), PaymentNotificationCapture.isCaptureEnabled()]);
    setAccessGranted(access.granted);
    setEnabled(capture.enabled);
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void refresh();

    const listenerPromise = App.addListener("resume", () => void refresh());
    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, refreshes on resume
  }, []);

  async function handleToggle(): Promise<void> {
    const next = !enabled;
    await PaymentNotificationCapture.setCaptureEnabled({ enabled: next });
    setEnabled(next);
  }

  if (!Capacitor.isNativePlatform()) return null; // native-only feature, nothing to show on web

  return (
    <SettingsCard title={t("settings.notificationCaptureTitle")} description={t("settings.notificationCaptureDescription")}>
      {accessGranted === false && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("settings.notificationCaptureExplain")}</p>
          <button
            type="button"
            onClick={() => void PaymentNotificationCapture.openAccessSettings()}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Bell size={18} />
            {t("settings.notificationCaptureOpenSettings")}
          </button>
        </div>
      )}

      {accessGranted === true && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">{t("settings.notificationCaptureEnable")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t("settings.notificationCaptureEnable")}
            onClick={() => void handleToggle()}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      )}
    </SettingsCard>
  );
}
