import { useEffect, useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { enrollTotp, completeTotpEnrollment, type TotpEnrollment } from "@/features/sync/mfa";
import { generateBackupCodes } from "@/features/sync/backupCodes";
import BackupCodesDisplay from "@/features/sync/components/BackupCodesDisplay";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

interface Props {
  onDone: () => void;
}

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

type Step = "loading" | "scan" | "codes" | "error";

// Two-step wizard: (1) scan the QR / enter the setup key, confirm with a
// code from the app; (2) immediately generate and show backup codes --
// shown exactly once, matching GitHub/Google's own enrollment UX.
export default function EnrollMfaForm({ onDone }: Props) {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const toast = useToast();

  const [step, setStep] = useState<Step>("loading");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    enrollTotp()
      .then((result) => {
        setEnrollment(result);
        setStep("scan");
      })
      .catch(() => setStep("error"));
  }, []);

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!enrollment || !user) return;

    setError(null);
    setSubmitting(true);
    try {
      await completeTotpEnrollment(enrollment.factorId, code);
      const codes = await generateBackupCodes(user.id);
      setBackupCodes(codes);
      setStep("codes");
    } catch {
      setError(t("mfa.invalidCode"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleFinish() {
    toast.success(t("mfa.enabledSuccess"));
    onDone();
  }

  if (step === "loading") {
    return <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{t("settings.processing")}</div>;
  }

  if (step === "error") {
    return <div className="p-6 text-center text-sm text-red-500">{t("mfa.enrollFailed")}</div>;
  }

  if (step === "codes") {
    return <BackupCodesDisplay codes={backupCodes} onDone={handleFinish} />;
  }

  return (
    <form
      onSubmit={handleConfirm}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{t("mfa.enrollTitle")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("mfa.enrollScanInstruction")}</p>

      {enrollment && (
        <img src={enrollment.qrCodeDataUri} alt="" className="mx-auto h-40 w-40 rounded-xl border border-zinc-200 dark:border-zinc-700" />
      )}

      <FormField label={t("mfa.enrollSecretLabel")} htmlFor="mfa-secret">
        <input
          id="mfa-secret"
          type="text"
          readOnly
          value={enrollment?.secret ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClassName} font-mono`}
        />
      </FormField>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("mfa.enrollConfirmInstruction")}</p>

      <FormField label={t("mfa.enrollCodeLabel")} htmlFor="mfa-confirm-code">
        <input
          id="mfa-confirm-code"
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

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        {t("mfa.enrollLogoutWarning")}
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.processing") : t("mfa.verifyButton")}
      </button>
    </form>
  );
}
