import { useAiCoachSettingsStore } from "@/store/aiCoachSettingsStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

export default function AiCoachSettings() {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useAiCoachSettingsStore();

  if (!isSyncConfigured) {
    return (
      <SettingsCard title={t("settings.aiCoachTitle")} description={t("settings.aiCoachNotConfiguredDescription")}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("settings.localOnlyData")}</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title={t("settings.aiCoachTitle")} description={t("settings.aiCoachDescription")}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">{t("settings.aiCoachEnable")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t("settings.aiCoachEnable")}
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
    </SettingsCard>
  );
}
