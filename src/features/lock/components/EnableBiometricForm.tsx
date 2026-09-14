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
    let success = false;
    try {
      success = await enableBiometric(pin);
    } catch {
      setSubmitting(false);
      setError(t("settings.biometricEnableFailed"));
      return;
    }
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
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6"
    >
      <h2 className="text-xl font-bold">{t("settings.enableBiometric")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("settings.biometricEnableExplain")}</p>

      <FormField
        label={t("settings.biometricConfirmPinLabel")}
        htmlFor="enable-biometric-pin"
        error={error ?? undefined}
      >
        <input
          id="enable-biometric-pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          minLength={4}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={inputClassName}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("settings.biometricPinHint")}</p>
      </FormField>

      <button
        type="submit"
        disabled={submitting || pin.length < 4}
        className="w-full rounded-xl py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 nexus-primary-action"
      >
        {submitting ? t("settings.biometricSaving") : t("common.save")}
      </button>
    </form>
  );
}
