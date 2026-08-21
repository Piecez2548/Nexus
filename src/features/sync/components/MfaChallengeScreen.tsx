import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/80 p-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

// Shown by AuthGate in place of LoginScreen once a password step succeeds
// but the account has a verified TOTP factor this browser session hasn't
// satisfied yet (authStore.ts's mfaPending). LoginScreen itself needs no
// changes for any of this -- AuthGate is what branches.
export default function MfaChallengeScreen() {
  const { mfaError, loading, verifyMfaCode, verifyBackupCode, cancelMfaChallenge } = useAuthStore();
  const { t } = useTranslation();

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    if (useBackupCode) {
      await verifyBackupCode(code);
    } else {
      await verifyMfaCode(code);
    }
    setSubmitting(false);
  }

  function handleToggleMethod() {
    setUseBackupCode((prev) => !prev);
    setCode("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-9 shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-900/5 dark:shadow-black/50 dark:ring-white/5"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 scale-150 rounded-full bg-brand-500/25 blur-xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-glow shadow-lg shadow-brand-600/30">
            <ShieldCheck size={24} className="text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight">{t("mfa.challengeTitle")}</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {useBackupCode ? t("mfa.challengeBackupSubtitle") : t("mfa.challengeSubtitle")}
          </p>
        </div>
      </div>

      <FormField label={useBackupCode ? t("mfa.backupCodeLabel") : t("mfa.codeLabel")} htmlFor="mfa-code">
        <input
          id="mfa-code"
          type="text"
          inputMode={useBackupCode ? "text" : "numeric"}
          autoFocus
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {mfaError && <p className="text-sm text-red-500">{mfaError}</p>}

      <button
        type="submit"
        disabled={submitting || loading}
        className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? t("settings.processing") : t("mfa.verifyButton")}
      </button>

      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={handleToggleMethod} className="text-center text-sm font-medium text-brand-500 hover:underline">
          {useBackupCode ? t("mfa.useCodeInstead") : t("mfa.useBackupCodeInstead")}
        </button>

        <button
          type="button"
          onClick={() => void cancelMfaChallenge()}
          className="text-center text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
