import { useEffect } from "react";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import ExportTransactionsPanel from "@/components/importExport/ExportTransactionsPanel";
import ImportTransactionsPanel from "@/components/importExport/ImportTransactionsPanel";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

export default function TransactionDataSettings() {
  const { transactions, loading, error, loadTransactions } = useTransactionStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return (
    <SettingsCard
      title={t("settings.importExportTitle")}
      description={t("settings.importExportDescription")}
    >
      {error ? (
        <ErrorState message={error} onRetry={loadTransactions} />
      ) : loading && transactions.length === 0 ? (
        <LoadingState label={t("transactions.loading")} />
      ) : (
        <div className="space-y-4">
          <ExportTransactionsPanel transactions={transactions} />
          <ImportTransactionsPanel />
        </div>
      )}
    </SettingsCard>
  );
}
