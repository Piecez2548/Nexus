import { useState, type FormEvent } from "react";

import { useAppLockStore } from "@/store/appLockStore";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  onDone: () => void;
}

export default function EnableBiometricForm({ onDone }: Props) {
  const enableBiometric = useAppLockStore((s) => s.enableBiometric);
  const toast = useToast();
  const { t } = useTranslation();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    setSubmitting(true);
    const success = await enableBiometric(pin);
    setSubmitting(false);

    if (!success) {
      setError(t("settings.biometricWrongPin"));
      return;
    }

    toast.success(t("settings.biometricEnableSuccess"));
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{t("settings.enableBiometric")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("settings.biometricEnableExplain")}</p>

      <FormField label={t("settings.biometricConfirmPinLabel")} htmlFor="enable-biometric-pin">
        <input
          id="enable-biometric-pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.biometricSaving") : t("common.save")}
      </button>
    </form>
  );
}
