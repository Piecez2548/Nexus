import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock, Zap, FingerprintPattern } from "lucide-react";

import { useAppLockStore, EncryptionStateCorruptedError } from "@/store/appLockStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import { retrieveBiometricPin } from "@/features/lock/services/biometricService";
import { useTranslation } from "@/i18n/useTranslation";
import EncryptionRecoveryFlow from "@/features/encryption/components/EncryptionRecoveryFlow";

const inputClassName =
  "w-full rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/80 p-3.5 text-center text-2xl tracking-[0.6em] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

interface Props {
  mode: "setup" | "unlock";
  onDone?: () => void;
}

export default function AppLockScreen({ mode, onDone }: Props) {
  const { setupPin, unlock, encryptionEnabled, biometricEnabled } = useAppLockStore();
  const { t } = useTranslation();

  const [showRecovery, setShowRecovery] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canRecover = mode === "unlock" && isSyncConfigured && encryptionEnabled;

  // Runs the recovered PIN through the exact same unlock() path as manual
  // entry — no parallel KEK/DEK code. Any cancel/failed-scan/unavailable
  // case resolves to null and is silently ignored: the always-visible PIN
  // field is the fallback, never an error banner. Only a genuine
  // post-success failure (corrupted encryption state) surfaces an error.
  async function attemptBiometricUnlock() {
    const recoveredPin = await retrieveBiometricPin();
    if (recoveredPin === null) return;

    setError(null);
    setSubmitting(true);

    try {
      const success = await unlock(recoveredPin, remember);
      setSubmitting(false);
      if (success) onDone?.();
    } catch (err) {
      setSubmitting(false);

      if (err instanceof EncryptionStateCorruptedError) {
        setError(t("lock.encryptionUnlockFailed"));
        return;
      }

      throw err;
    }
  }

  const hasAutoTriggered = useRef(false);

  useEffect(() => {
    if (mode !== "unlock" || !biometricEnabled || hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    void attemptBiometricUnlock();
    // Only ever auto-triggers once per mount — deliberately excludes
    // attemptBiometricUnlock (and its `remember` dependency) so toggling
    // "remember me" mid-screen can't re-fire the OS prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, biometricEnabled]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError(t("lock.pinMinLength"));
      return;
    }

    if (mode === "setup") {
      if (pin !== confirmPin) {
        setError(t("lock.pinConfirmMismatch"));
        return;
      }

      setSubmitting(true);
      await setupPin(pin, remember);
      setSubmitting(false);
      onDone?.();
      return;
    }

    setSubmitting(true);

    try {
      const success = await unlock(pin, remember);
      setSubmitting(false);

      if (!success) {
        setError(t("lock.pinIncorrect"));
        setPin("");
        return;
      }

      onDone?.();
    } catch (err) {
      setSubmitting(false);
      setPin("");

      if (err instanceof EncryptionStateCorruptedError) {
        setError(t("lock.encryptionUnlockFailed"));
        return;
      }

      throw err;
    }
  }

  if (showRecovery) {
    return <EncryptionRecoveryFlow onDone={() => onDone?.()} onCancel={() => setShowRecovery(false)} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-9 shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-900/5 dark:shadow-black/50 dark:ring-white/5"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 scale-150 rounded-full bg-brand-500/25 blur-xl" />
          <div
            className="relative flex h-12 w-12 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-glow shadow-lg shadow-brand-600/30"
            style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
          >
            <Zap size={22} className="text-white" fill="currentColor" />
          </div>
        </div>

        <div>
          <h1 className="text-balance text-2xl font-bold">
            {mode === "setup" ? t("lock.setupTitle") : t("lock.unlockTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "setup"
              ? t("lock.setupSubtitle")
              : t("lock.unlockSubtitle")}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="lock-pin" className="mb-1.5 flex items-center justify-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          <Lock size={14} />
          PIN
        </label>
        <input
          id="lock-pin"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className={inputClassName}
        />
      </div>

      {mode === "setup" && (
        <div>
          <label htmlFor="lock-pin-confirm" className="mb-1.5 block text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("lock.confirmPinLabel")}
          </label>
          <input
            id="lock-pin-confirm"
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className={inputClassName}
          />
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded accent-brand-600"
        />
        {t("lock.rememberMe")}
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-brand-600 py-3 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? t("lock.processing") : mode === "setup" ? t("lock.setupPinButton") : t("lock.unlockButton")}
      </button>

      {mode === "unlock" && biometricEnabled && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void attemptBiometricUnlock()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-3 font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FingerprintPattern size={18} className="text-brand-500" />
          {t("lock.useBiometric")}
        </button>
      )}

      {canRecover && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowRecovery(true);
          }}
          className="w-full text-center text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          {t("lock.forgotPin")}
        </button>
      )}
    </form>
  );
}
