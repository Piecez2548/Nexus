import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/80 p-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

// Shown by AuthGate in place of LoginScreen once signUp() succeeds but the
// account still needs its emailed OTP code entered (authStore.ts's
// emailVerificationPending). LoginScreen itself needs no changes for any of
// this -- AuthGate is what branches, same as it does for MfaChallengeScreen.
export default function EmailVerificationScreen() {
  const { pendingVerificationEmail, emailVerificationError, loading, verifyEmailOtp, resendEmailVerification, cancelEmailVerification } =
    useAuthStore();
  const { t } = useTranslation();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await verifyEmailOtp(code);
    setSubmitting(false);
  }

  async function handleResend() {
    setResending(true);
    await resendEmailVerification();
    setResending(false);
    if (!useAuthStore.getState().emailVerificationError) {
      useToastStore.getState().show("success", t("login.codeResent"));
    }
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
            <MailCheck size={24} className="text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight">{t("login.verifyEmailTitle")}</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {t("login.verifyEmailSubtitle", { email: pendingVerificationEmail ?? "" })}
          </p>
        </div>
      </div>

      <FormField label={t("login.otpCodeLabel")} htmlFor="email-otp-code">
        <input
          id="email-otp-code"
          type="text"
          inputMode="numeric"
          autoFocus
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      {emailVerificationError && <p className="text-sm text-red-500">{emailVerificationError}</p>}

      <button
        type="submit"
        disabled={submitting || loading}
        className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {submitting ? t("settings.processing") : t("login.verifyEmailButton")}
      </button>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending}
          className="text-center text-sm font-medium text-brand-500 hover:underline disabled:opacity-60"
        >
          {t("login.resendCode")}
        </button>

        <button
          type="button"
          onClick={() => cancelEmailVerification()}
          className="text-center text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
