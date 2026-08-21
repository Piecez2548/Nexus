import { useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { verifyTotpCode } from "@/features/sync/mfa";
import { generateBackupCodes } from "@/features/sync/backupCodes";
import BackupCodesDisplay from "@/features/sync/components/BackupCodesDisplay";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

interface Props {
  factorId: string;
  onDone: () => void;
}

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

// Requires a fresh TOTP code before regenerating -- proves the authenticator
// is still held, matching DisableLockForm.tsx's "re-prove before a
// sensitive action" precedent (there via PIN re-entry).
export default function RegenerateBackupCodesForm({ factorId, onDone }: Props) {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const toast = useToast();

  const [step, setStep] = useState<"confirm" | "codes">("confirm");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setError(null);
    setSubmitting(true);
    try {
      await verifyTotpCode(factorId, code);
      const newCodes = await generateBackupCodes(user.id);
      setCodes(newCodes);
      setStep("codes");
    } catch {
      setError(t("mfa.invalidCode"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleFinish() {
    toast.success(t("mfa.codesRegenerated"));
    onDone();
  }

  if (step === "codes") {
    return <BackupCodesDisplay codes={codes} onDone={handleFinish} />;
  }

  return (
    <form
      onSubmit={handleConfirm}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">{t("mfa.regenerateTitle")}</h2>

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        {t("mfa.regenerateWarning")}
      </p>

      <FormField label={t("mfa.enrollCodeLabel")} htmlFor="regenerate-code">
        <input
          id="regenerate-code"
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

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.processing") : t("mfa.regenerateConfirmButton")}
      </button>
    </form>
  );
}
