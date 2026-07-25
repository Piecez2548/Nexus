import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { parseTransactionsCsv } from "@/features/finance/utils/transactionCsv";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useTranslation } from "@/i18n/useTranslation";
import type { ParsedTransactionsCsv } from "@/features/finance/utils/transactionCsv";

export default function ImportTransactionsPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addTransaction } = useTransactionStore();
  const { t } = useTranslation();

  const [parsed, setParsed] = useState<ParsedTransactionsCsv | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSelectClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setImportedCount(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      setParsed(parseTransactionsCsv(text));
    } catch (err) {
      setError(toErrorMessage(err));
      setParsed(null);
    }
  }

  async function handleConfirmImport() {
    if (!parsed || parsed.valid.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      for (const transaction of parsed.valid) {
        await addTransaction(transaction);
      }

      setImportedCount(parsed.valid.length);
      setParsed(null);
      setFileName(null);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold">{t("settings.importTransactions")}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {t("settings.importCsvDescription")}
      </p>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSelectClick}
          disabled={importing}
          className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-2 transition hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
        >
          <Upload size={16} />
          {t("settings.selectCsvFile")}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileSelected}
          className="hidden"
          aria-label="Import transactions CSV file"
        />
      </div>

      {fileName && parsed && (
        <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-sm">
            <span className="font-medium">{fileName}</span> — {t("settings.validRowsFound", { count: parsed.valid.length })}
            {parsed.errors.length > 0 && t("settings.rowsWithErrors", { count: parsed.errors.length })}
          </p>

          {parsed.errors.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-500">
              {parsed.errors.map((e) => (
                <li key={e.row}>
                  {t("settings.rowError", { row: e.row, message: e.message })}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={importing || parsed.valid.length === 0}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {importing ? t("settings.importingProgress") : t("settings.confirmImportCount", { count: parsed.valid.length })}
          </button>
        </div>
      )}

      {importedCount !== null && (
        <p className="mt-3 text-sm text-green-500">{t("settings.importedCountSuccess", { count: importedCount })}</p>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}
