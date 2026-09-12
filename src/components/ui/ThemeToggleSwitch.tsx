import { Moon } from "lucide-react";
import { useAppSettingsStore } from "@/store/appSettingsStore";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useTranslation } from "@/i18n/useTranslation";

export default function ThemeToggleSwitch() {
  const themeMode = useAppSettingsStore((s) => s.themeMode);
  const setThemeMode = useAppSettingsStore((s) => s.setThemeMode);
  const isDark = useResolvedTheme(themeMode);
  const { t } = useTranslation();

  function handleToggle() {
    setThemeMode(isDark ? "light" : "dark");
  }

  return (
    <div className="flex items-center justify-between px-2 py-1">
      <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Moon size={16} />
        {t("settings.darkMode")}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={t("topbar.toggleDarkMode")}
        onClick={handleToggle}
        className="relative h-11 w-11 shrink-0 rounded-lg"
      >
        <span aria-hidden="true" className={`absolute left-1 top-3 h-5 w-9 rounded-full transition-colors ${
          isDark ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}>
        <span
          className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
        </span>
      </button>
    </div>
  );
}
