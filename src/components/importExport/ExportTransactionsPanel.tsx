import { FileDown, FileText, FileJson } from "lucide-react";

import { transactionsToCsv } from "@/features/finance/utils/transactionCsv";
import { downloadTransactionsPdf } from "@/features/finance/utils/transactionPdf";
import { downloadFile } from "@/utils/download";
import { useTranslation } from "@/i18n/useTranslation";
import type { Transaction } from "@/features/finance/types";

interface Props {
  transactions: Transaction[];
}

function downloadCsv(transactions: Transaction[]) {
  const csv = transactionsToCsv(transactions);
  downloadFile(`nexus-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8;");
}

function downloadJson(transactions: Transaction[]) {
  const json = JSON.stringify(transactions, null, 2);
  downloadFile(`nexus-transactions-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
}

const FORMATS = [
  { key: "csv", label: "CSV", extension: ".csv", icon: FileDown, action: downloadCsv },
  { key: "pdf", label: "PDF", extension: ".pdf", icon: FileText, action: downloadTransactionsPdf },
  { key: "json", label: "JSON", extension: ".json", icon: FileJson, action: downloadJson },
];

export default function ExportTransactionsPanel({ transactions }: Props) {
  const disabled = transactions.length === 0;
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold">{t("settings.exportTransactions")}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {t("settings.exportCount", { count: transactions.length })}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {FORMATS.map(({ key, label, extension, icon: Icon, action }) => (
          <button
            key={key}
            type="button"
            onClick={() => action(transactions)}
            disabled={disabled}
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            <Icon size={22} className="text-brand-500" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{extension}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
