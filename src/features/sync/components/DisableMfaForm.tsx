import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { unenrollTotp } from "@/features/sync/mfa";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  factorId: string;
  onDone: () => void;
}

export default function DisableMfaForm({ factorId, onDone }: Props) {
  const { t } = useTranslation();
  const toast = useToast();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await unenrollTotp(factorId);
      toast.success(t("mfa.disabledSuccess"));
      onDone();
    } catch {
      setError(t("mfa.enrollFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-xl font-bold">{t("mfa.disableTitle")}</h2>

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        {t("mfa.disableWarning")}
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 font-semibold text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("settings.processing") : t("mfa.disableConfirmButton")}
      </button>
    </div>
  );
}
