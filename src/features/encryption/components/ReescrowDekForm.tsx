import { useState, type FormEvent } from "react";

import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { reescrowDek, ReescrowFailedError } from "@/features/encryption/migration/reescrowDek";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  onDone: () => void;
}

export default function ReescrowDekForm({ onDone }: Props) {
  const toast = useToast();
  const { t } = useTranslation();

  const [accountPassword, setAccountPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (accountPassword.length === 0) {
      setError(t("settings.enterSyncPassword"));
      return;
    }

    setSubmitting(true);
    try {
      await reescrowDek(accountPassword);
      toast.success(t("settings.reescrowSuccess"));
      onDone();
    } catch (err) {
      setError(err instanceof ReescrowFailedError ? err.message : t("settings.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{t("settings.encryptionReescrowButton")}</h2>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("settings.reescrowDescription")}
      </p>

      <FormField label={t("settings.currentSyncPasswordLabel")} htmlFor="reescrow-password">
        <input
          id="reescrow-password"
          type="password"
          value={accountPassword}
          onChange={(e) => setAccountPassword(e.target.value)}
          disabled={submitting}
          className={inputClassName}
        />
      </FormField>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.updating") : t("settings.encryptionReescrowButton")}
      </button>
    </form>
  );
}
