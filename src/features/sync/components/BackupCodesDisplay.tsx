import { Copy } from "lucide-react";

import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  codes: string[];
  onDone: () => void;
}

// Shown exactly once, right after generateBackupCodes() returns -- reused
// by both EnrollMfaForm's second step and RegenerateBackupCodesForm, since
// "here are your new codes, save them now" is the same screen either way.
export default function BackupCodesDisplay({ codes, onDone }: Props) {
  const { t } = useTranslation();
  const toast = useToast();

  async function handleCopyAll() {
    await navigator.clipboard.writeText(codes.join("\n"));
    toast.success(t("mfa.codesCopied"));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-xl font-bold">{t("mfa.backupCodesTitle")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("mfa.backupCodesDescription")}</p>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 font-mono text-sm">
        {codes.map((code) => (
          <div key={code}>{code}</div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCopyAll}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Copy size={16} />
        {t("mfa.copyButton")}
      </button>

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700"
      >
        {t("mfa.backupCodesSavedConfirm")}
      </button>
    </div>
  );
}
