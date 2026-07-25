import { useLanguageStore, type Language } from "@/store/languageStore";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

const OPTIONS: { code: Language; label: string }[] = [
  { code: "th", label: "ไทย" },
  { code: "en", label: "English" },
];

export default function LanguageSettings() {
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();

  return (
    <SettingsCard title={t("settings.language")} description={t("settings.languageDescription")}>
      <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
        {OPTIONS.map(({ code, label }) => {
          const isActive = language === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              aria-pressed={isActive}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
