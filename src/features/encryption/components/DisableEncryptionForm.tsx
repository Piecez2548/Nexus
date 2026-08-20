import { useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";

import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { disableEncryption, type DisableMigrationProgress } from "@/features/encryption/migration/disableEncryption";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  onDone: () => void;
}

const PHASE_LABEL_KEYS: Record<DisableMigrationProgress["phase"], string> = {
  backup: "settings.phaseBackupBeforeDisabling",
  decrypting: "settings.phaseDecrypting",
  verifying: "settings.phaseVerifying",
  done: "settings.phaseDone",
};

export default function DisableEncryptionForm({ onDone }: Props) {
  const toast = useToast();
  const { t } = useTranslation();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<DisableMigrationProgress | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError(t("settings.enterYourPin"));
      return;
    }

    setSubmitting(true);
    try {
      await disableEncryption({ pin, onProgress: setProgress, translate: t });
      toast.success(t("settings.encryptionDisabledSuccess"));
      onDone();
    } catch (err) {
      setSubmitting(false);
      setProgress(null);
      setError(err instanceof Error ? err.message : t("settings.encryptionErrorGeneric"));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{t("settings.disableEncryptionTitle")}</h2>

      <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
        <p className="flex items-start gap-2">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {t("settings.disableEncryptionWarning")}
        </p>
        <p>{t("settings.disableEncryptionVaultWarning")}</p>
        <p>{t("settings.disableEncryptionRecoveryKeyNotice")}</p>
        <p>{t("settings.backupDownloadNotice")}</p>
      </div>

      <FormField label={t("settings.currentPinYoursLabel")} htmlFor="disable-encryption-pin">
        <input
          id="disable-encryption-pin"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      {progress && (
        <p className="text-sm text-brand-500">
          {t(PHASE_LABEL_KEYS[progress.phase])}
          {progress.phase === "decrypting" && progress.tableCount !== undefined && (
            <>
              {" "}
              ({(progress.tableIndex ?? 0) + 1}/{progress.tableCount})
            </>
          )}
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-semibold text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.disabling") : t("settings.encryptionDisableButton")}
      </button>
    </form>
  );
}
