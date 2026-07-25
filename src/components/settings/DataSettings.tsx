import { useRef, useState } from "react";
import { Download, Upload, TriangleAlert, Merge } from "lucide-react";

import { exportBackup, importBackup, resetAllData } from "@/database/backupService";
import { dedupeAccountsAndCategories } from "@/features/finance/utils/dedupeAccountsAndCategories";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

interface TileProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

function DataTile({ icon, label, description, onClick, disabled, tone = "default" }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition disabled:opacity-50 ${
        tone === "danger"
          ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
      }`}
    >
      <span className={tone === "danger" ? "text-red-500" : "text-violet-500"}>{icon}</span>

      <span className={`font-medium ${tone === "danger" ? "text-red-500" : ""}`}>{label}</span>

      <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
    </button>
  );
}

export default function DataSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { loadAccounts } = useAccountStore();
  const { loadCategories } = useCategoryStore();
  const { t } = useTranslation();

  async function handleExport() {
    setError(null);
    setStatus(null);

    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();

      URL.revokeObjectURL(url);
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
      await importBackup(text);
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

  async function handleReset() {
    const confirmed = window.confirm(t("settings.resetConfirmDialog"));
    if (!confirmed) return;

    setError(null);
    setStatus(null);
    setBusy(true);

    try {
      await resetAllData();
      setStatus(t("settings.resetSuccessReloading"));
      toast.success(t("settings.resetSuccess"));
      window.location.reload();
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={t("settings.data")} description={t("settings.dataDescription")}>
      <div className="grid grid-cols-3 gap-3">
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
          icon={<TriangleAlert size={20} />}
          label={t("settings.resetAllData")}
          description={t("settings.resetAllDataDescription")}
          onClick={handleReset}
          disabled={busy}
          tone="danger"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          className="hidden"
          aria-label="Import backup file"
        />
      </div>

      {status && <p className="mt-3 text-sm text-green-500">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </SettingsCard>
  );
}
