import { Moon, Sun, Monitor, Contrast } from "lucide-react";

import { useAppSettingsStore, type ThemeMode } from "@/store/appSettingsStore";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

const OPTIONS: { mode: ThemeMode; labelKey: string; icon: typeof Sun }[] = [
  { mode: "light", labelKey: "settings.light", icon: Sun },
  { mode: "dark", labelKey: "settings.dark", icon: Moon },
  { mode: "system", labelKey: "settings.system", icon: Monitor },
  { mode: "mono", labelKey: "settings.mono", icon: Contrast },
];

export default function ThemeSettings() {
  const { themeMode, setThemeMode } = useAppSettingsStore();
  const { t } = useTranslation();

  return (
    <SettingsCard title={t("settings.appearance")} description={t("settings.appearanceDescription")}>
      <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
        {OPTIONS.map(({ mode, labelKey, icon: Icon }) => {
          const isActive = themeMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setThemeMode(mode)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
