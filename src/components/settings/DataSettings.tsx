import { useEffect, useRef, useState } from "react";
import { Check, Download, Upload, Merge, Copy } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { exportBackup, importBackup } from "@/database/backupService";
import { dedupeAccountsAndCategories } from "@/features/finance/utils/dedupeAccountsAndCategories";
import {
  findTransactionDuplicates,
  mergeTransactionDuplicates,
  type TransactionDuplicateGroup,
} from "@/features/finance/utils/dedupeTransactions";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import Drawer from "@/components/ui/Drawer";
import SettingsCard from "./SettingsCard";

interface TileProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

function DataTile({ icon, label, description, onClick, disabled }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
    >
      <span className="text-brand-500">{icon}</span>
      <span className="font-medium">{label}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
    </button>
  );
}

export default function DataSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [duplicatePreview, setDuplicatePreview] = useState<TransactionDuplicateGroup[] | null>(null);
  // Groups the user has unchecked in the preview -- excluded from the merge.
  // The matching key is an exact match on every content field (see
  // dedupeTransactions.ts), which is strict, but not infallible: two
  // genuinely separate transactions with no `time` set (common for manual
  // entries) can still collide -- e.g. two identical ฿35 coffees bought
  // separately on the same day. Without a per-group opt-out, confirming
  // ever merged every detected group at once, with no way to keep a real
  // false positive out of the deletion.
  const [excludedGroupKeys, setExcludedGroupKeys] = useState<Set<string>>(new Set());
  const toast = useToast();
  const { loadAccounts } = useAccountStore();
  const { loadCategories } = useCategoryStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleExport() {
    setError(null);
    setStatus(null);

    try {
      const json = await exportBackup();
      const filename = `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (Capacitor.isNativePlatform()) {
        // A blob-URL <a download> click is unreliable inside a native
        // WebView (Android's WebView doesn't reliably wire it up to a real
        // file save, unlike a desktop/mobile browser tab) — it can silently
        // no-op with no error to catch, which is exactly what happened here.
        // Filesystem.writeFile + Share.share is the standard Capacitor
        // pattern instead: write to the app's private cache (no storage
        // permission needed), then hand it to the OS share sheet so the
        // user picks where it actually goes (Files, Drive, email, etc.).
        const { uri } = await Filesystem.writeFile({
          path: filename,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({ url: uri, title: filename });
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
      }

      setStatus(t("settings.exportSuccess"));
      toast.success(t("settings.exportSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const confirmed = window.confirm(t("settings.importConfirmDialog"));
    if (!confirmed) return;

    setError(null);
    setStatus(null);
    setBusy(true);

    try {
      const text = await file.text();
      await importBackup(text, t);
      setStatus(t("settings.importSuccessReloading"));
      toast.success(t("settings.importSuccess"));
      window.location.reload();
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  async function handleDedupe() {
    setError(null);
    setStatus(null);
    setBusy(true);

    try {
      const { accountsMerged, categoriesMerged } = await dedupeAccountsAndCategories();
      await Promise.all([loadAccounts(), loadCategories()]);

      const message =
        accountsMerged === 0 && categoriesMerged === 0
          ? t("settings.noDuplicatesFound")
          : t("settings.dedupeMergedResult", { accountsMerged, categoriesMerged });

      setStatus(message);
      toast.success(message);
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function handleFindTransactionDuplicates() {
    setError(null);
    setStatus(null);

    const groups = findTransactionDuplicates(transactions);
    if (groups.length === 0) {
      setStatus(t("settings.noTransactionDuplicatesFound"));
      return;
    }

    setExcludedGroupKeys(new Set());
    setDuplicatePreview(groups);
  }

  function toggleGroupExcluded(key: string) {
    setExcludedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectedGroups = (duplicatePreview ?? []).filter((g) => !excludedGroupKeys.has(g.key));

  async function handleConfirmMergeTransactions() {
    if (selectedGroups.length === 0) return;

    setBusy(true);

    try {
      const removed = await mergeTransactionDuplicates(selectedGroups);
      await loadTransactions();
      setDuplicatePreview(null);

      const message = t("settings.transactionDuplicatesMergedResult", { count: removed });
      setStatus(message);
      toast.success(message);
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={t("settings.data")} description={t("settings.dataDescription")}>
      <div className="grid grid-cols-2 gap-3">
        <DataTile
          icon={<Download size={20} />}
          label={t("settings.exportBackup")}
          description={t("settings.exportBackupDescription")}
          onClick={handleExport}
          disabled={busy}
        />

        <DataTile
          icon={<Upload size={20} />}
          label={t("settings.importBackup")}
          description={t("settings.importBackupDescription")}
          onClick={handleImportClick}
          disabled={busy}
        />

        <DataTile
          icon={<Merge size={20} />}
          label={t("settings.mergeDuplicates")}
          description={t("settings.mergeDuplicatesDescription")}
          onClick={handleDedupe}
          disabled={busy}
        />

        <DataTile
          icon={<Copy size={20} />}
          label={t("settings.mergeTransactionDuplicates")}
          description={t("settings.mergeTransactionDuplicatesDescription")}
          onClick={handleFindTransactionDuplicates}
          disabled={busy}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          className="hidden"
          aria-label={t("settings.importBackupAriaLabel")}
        />
      </div>

      {status && <p className="mt-3 text-sm text-green-500">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <Drawer open={duplicatePreview !== null} onClose={() => setDuplicatePreview(null)}>
        {duplicatePreview && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              {t("settings.transactionDuplicatesFoundTitle", { count: duplicatePreview.length })}
            </h2>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {duplicatePreview.map((group) => {
                const checked = !excludedGroupKeys.has(group.key);
                return (
                  <label
                    key={group.key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        checked ? "border-brand-500 bg-brand-500 text-white" : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {checked && <Check size={14} />}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroupExcluded(group.key)}
                      className="sr-only"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{group.keep.title}</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          ฿{group.keep.amount.toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{group.keep.date}</p>
                      <p className="mt-1 text-xs text-green-500">{t("settings.transactionDuplicateKeepNote")}</p>
                      <p className="text-xs text-red-500">
                        {t("settings.transactionDuplicateRemoveCount", { count: group.remove.length })}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDuplicatePreview(null)}
                disabled={busy}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 py-2.5 font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                onClick={handleConfirmMergeTransactions}
                disabled={busy || selectedGroups.length === 0}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("settings.confirmMergeTransactions", { count: selectedGroups.length })}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </SettingsCard>
  );
}
