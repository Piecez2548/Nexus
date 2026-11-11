import { Capacitor } from "@capacitor/core";

import { useScanScheduleStore } from "@/features/finance/slipScanner/store/scanScheduleStore";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

// Opt-out switch for the hands-free gallery scan that runs when the app opens
// or returns to the foreground (Android only -- a browser cannot enumerate the
// gallery). It only flips the existing scan-schedule config; the scan itself,
// its permission flow and Smart Import are unchanged. Applies from the next
// app launch (the scanner is mounted once at startup).
export default function AutoSlipScanSettings() {
  const { t } = useTranslation();
  const config = useScanScheduleStore((s) => s.config);
  const setConfig = useScanScheduleStore((s) => s.setConfig);

  if (!Capacitor.isNativePlatform()) return null;

  const enabled = config.enabled && config.scanOnStartup;

  return (
    <SettingsCard title={t("settings.autoSlipScanTitle")} description={t("settings.autoSlipScanDescription")}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">{t("settings.autoSlipScanEnable")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t("settings.autoSlipScanEnable")}
          onClick={() => setConfig({ enabled: true, scanOnStartup: !enabled })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{t("settings.autoSlipScanNote")}</p>
    </SettingsCard>
  );
}
