import { useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, Copy, KeyRound, StickyNote, ShieldCheck } from "lucide-react";

import { useVaultEntryStore } from "@/features/vault/store/vaultEntryStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { VaultEntry } from "@/features/vault/types";

const TYPE_ICON = { password: KeyRound, note: StickyNote, recoveryKey: ShieldCheck } as const;

interface Props {
  entry: VaultEntry;
  onEdit: () => void;
}

export default function VaultEntryCard({ entry, onEdit }: Props) {
  const { deleteEntry } = useVaultEntryStore();
  const [revealed, setRevealed] = useState(false);
  const { t } = useTranslation();
  const toast = useToast();

  const Icon = TYPE_ICON[entry.type];
  const secretValue = entry.type === "recoveryKey" ? entry.code : entry.type === "password" ? entry.password : undefined;
  const typeLabel =
    entry.type === "password"
      ? t("vault.typePassword")
      : entry.type === "note"
        ? t("vault.typeNote")
        : t("vault.typeRecoveryKey");

  async function handleDelete() {
    if (entry.id === undefined) return;
    if (!window.confirm(t("vault.deleteConfirm", { title: entry.title }))) return;

    try {
      await deleteEntry(entry.id);
      toast.success(t("vault.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  async function copySecret() {
    if (!secretValue) return;
    try {
      await navigator.clipboard.writeText(secretValue);
      toast.success(t("vault.copiedToClipboard"));
    } catch {
      toast.error(t("vault.copyFailed"));
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-brand-500" />
          <div>
            <h3 className="font-semibold">{entry.title}</h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{typeLabel}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={t("vault.editEntry", { title: entry.title })}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={handleDelete}
            aria-label={t("vault.deleteEntry", { title: entry.title })}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {entry.type === "password" && entry.username && (
        <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">{entry.username}</p>
      )}

      {entry.type === "note" && entry.content && (
        <p className="mb-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{entry.content}</p>
      )}

      {entry.type === "recoveryKey" && entry.serviceName && (
        <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">{entry.serviceName}</p>
      )}

      {secretValue && (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 truncate rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 font-mono text-sm">
            {revealed ? secretValue : "••••••••••••"}
          </span>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? t("vault.hide") : t("vault.reveal")}
            className="shrink-0 rounded-lg p-2 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={copySecret}
            aria-label={t("vault.copy")}
            className="shrink-0 rounded-lg p-2 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <Copy size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
