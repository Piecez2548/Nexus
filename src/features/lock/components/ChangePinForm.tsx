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

export default function ChangePinForm({ onDone }: Props) {
  const { changePin } = useAppLockStore();
  const toast = useToast();
  const { t } = useTranslation();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPin.length < 4) {
      setError(t("lock.newPinMinLength"));
      return;
    }

    if (newPin !== confirmPin) {
      setError(t("lock.pinMismatch"));
      return;
    }

    const hadBiometricBefore = useAppLockStore.getState().biometricEnabled;

    setSubmitting(true);
    const success = await changePin(currentPin, newPin);
    setSubmitting(false);

    if (!success) {
      setError(t("lock.currentPinIncorrect"));
      return;
    }

    // changePin() fails closed: if re-storing the biometric credential under
    // the new PIN failed, it silently disables biometricEnabled rather than
    // block the PIN change itself. Surface that here so the user isn't left
    // wondering why fingerprint unlock quietly stopped working.
    if (hadBiometricBefore && !useAppLockStore.getState().biometricEnabled) {
      toast.warning(t("settings.biometricResyncFailedWarning"));
    } else {
      toast.success(t("lock.pinChanged"));
    }
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{t("lock.changePinTitle")}</h2>

      <FormField label={t("lock.currentPinLabel")} htmlFor="change-pin-current">
        <input
          id="change-pin-current"
          type="password"
          inputMode="numeric"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("lock.newPinLabel")} htmlFor="change-pin-new">
        <input
          id="change-pin-new"
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("lock.confirmNewPinLabel")} htmlFor="change-pin-confirm">
        <input
          id="change-pin-confirm"
          type="password"
          inputMode="numeric"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("lock.saving") : t("common.save")}
      </button>
    </form>
  );
}
