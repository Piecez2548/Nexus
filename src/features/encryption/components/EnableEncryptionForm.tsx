import { useState, type FormEvent } from "react";

import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { enableEncryption, type MigrationProgress } from "@/features/encryption/migration/enableEncryption";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  onDone: () => void;
}

const PHASE_LABEL_KEYS: Record<MigrationProgress["phase"], string> = {
  backup: "settings.phaseBackup",
  escrow: "settings.phaseEscrow",
  encrypting: "settings.phaseEncrypting",
  verifying: "settings.phaseVerifying",
  done: "settings.phaseDone",
};

export default function EnableEncryptionForm({ onDone }: Props) {
  const toast = useToast();
  const { t } = useTranslation();

  const [pin, setPin] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError(t("settings.enterYourPin"));
      return;
    }
    if (accountPassword.length === 0) {
      setError(t("settings.enterSyncPassword"));
      return;
    }

    setSubmitting(true);
    try {
      await enableEncryption({ pin, accountPassword, onProgress: setProgress });
      toast.success(t("settings.encryptionEnabledSuccess"));
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
      <h2 className="text-xl font-bold">{t("settings.enableEncryptionTitle")}</h2>

      <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
        <p>{t("settings.backupDownloadNotice")}</p>
        <p>{t("settings.otherDevicesNotice")}</p>
      </div>

      <FormField label={t("settings.currentPinYoursLabel")} htmlFor="enable-encryption-pin">
        <input
          id="enable-encryption-pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("settings.confirmSyncPasswordLabel")} htmlFor="enable-encryption-password">
        <input
          id="enable-encryption-password"
          type="password"
          value={accountPassword}
          onChange={(e) => setAccountPassword(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      {progress && (
        <p className="text-sm text-brand-500">
          {t(PHASE_LABEL_KEYS[progress.phase])}
          {progress.phase === "encrypting" && progress.tableCount !== undefined && (
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
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.encrypting") : t("settings.startEncryptingButton")}
      </button>
    </form>
  );
}
