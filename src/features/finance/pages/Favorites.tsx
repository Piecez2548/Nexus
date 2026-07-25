import { useEffect, useMemo } from "react";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import TransactionTable from "@/features/finance/components/TransactionTable";
import QuickAddGrid from "@/features/finance/components/QuickAddGrid";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function Favorites() {
  const { transactions, loading, error, loadTransactions } = useTransactionStore();
  const { loadCategories } = useCategoryStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, [loadTransactions, loadCategories]);

  const favorites = useMemo(
    () => transactions.filter((item) => item.favorite),
    [transactions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("favorites.pageTitle")}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-500">
          {t("favorites.description")}
        </p>
      </div>

      <QuickAddGrid />

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("favorites.sectionTitle")}</h2>

        {error ? (
          <ErrorState message={error} onRetry={loadTransactions} />
        ) : loading && transactions.length === 0 ? (
          <LoadingState label={t("favorites.loading")} />
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
            {t("favorites.emptyState")}
          </div>
        ) : (
          <TransactionTable transactions={favorites} />
        )}
      </div>
    </div>
  );
}
