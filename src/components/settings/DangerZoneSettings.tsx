import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { resetAllData } from "@/database/backupService";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

export default function DangerZoneSettings() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();

  async function handleReset() {
    const confirmed = window.confirm(t("settings.resetConfirmDialog"));
    if (!confirmed) return;

    setError(null);
    setBusy(true);

    try {
      await resetAllData();
      toast.success(t("settings.resetSuccess"));
      window.location.reload();
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={t("settings.groupDangerZone")} description={t("settings.dangerZoneDescription")}>
      <button
        type="button"
        onClick={handleReset}
        disabled={busy}
        className="flex w-full items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-left transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TriangleAlert size={20} className="shrink-0 text-red-500" />
        <span>
          <span className="block font-medium text-red-500">{t("settings.resetAllData")}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {t("settings.resetAllDataDescription")}
          </span>
        </span>
      </button>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </SettingsCard>
  );
}
