import { useEffect, useMemo, useState } from "react";
import { Plus, ScanLine } from "lucide-react";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useUIStore } from "@/features/finance/store/uiStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useAccountStore } from "@/features/finance/store/accountStore";

import TransactionTable from "@/features/finance/components/TransactionTable";
import TransactionToolbar from "@/features/finance/components/TransactionToolbar";
import SlipScanner from "@/features/finance/components/SlipScanner";
import GalleryScanFlow from "@/features/finance/slipScanner/components/GalleryScanFlow";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function Transactions() {
  const { t } = useTranslation();
  const {
    transactions,
    loading,
    error,
    loadTransactions,
  } = useTransactionStore();

  const { openTransactionDrawer } = useUIStore();
  const { categories, loadCategories } = useCategoryStore();
  const { accounts, loadAccounts } = useAccountStore();

  const handleAddClick = () => openTransactionDrawer();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadCategories();
    loadAccounts();
  }, [loadTransactions, loadCategories, loadAccounts]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchSearch =
        item.title
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchType =
        filterType === "all"
          ? true
          : item.type === filterType;

      const matchCategory =
        filterCategory === "all"
          ? true
          : item.category === filterCategory;

      const matchAccount =
        filterAccount === "all"
          ? true
          : item.account === filterAccount || item.toAccount === filterAccount;

      const matchDateFrom = !filterDateFrom || item.date >= filterDateFrom;
      const matchDateTo = !filterDateTo || item.date <= filterDateTo;

      return (
        matchSearch &&
        matchType &&
        matchCategory &&
        matchAccount &&
        matchDateFrom &&
        matchDateTo
      );
    });
  }, [
    transactions,
    search,
    filterType,
    filterCategory,
    filterAccount,
    filterDateFrom,
    filterDateTo,
  ]);

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <h1 className="text-3xl font-bold">
          {t("transactions.pageTitle")}
        </h1>

        <div className="flex gap-3">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ScanLine size={18} />
            {t("transactions.scanSlip")}
          </button>

          <GalleryScanFlow />

          <button
            onClick={handleAddClick}
            className="hidden items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700 md:flex"
          >
            <Plus size={18} />
            {t("transactions.addTransaction")}
          </button>
        </div>

      </div>

      {/* Toolbar */}

      <TransactionToolbar
        search={search}
        setSearch={setSearch}
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterAccount={filterAccount}
        setFilterAccount={setFilterAccount}
        filterDateFrom={filterDateFrom}
        setFilterDateFrom={setFilterDateFrom}
        filterDateTo={filterDateTo}
        setFilterDateTo={setFilterDateTo}
        categoryNames={categories.map((c) => c.name)}
        accountNames={accounts.map((a) => a.name)}
        total={filteredTransactions.length}
      />

      {/* Table */}

      {error ? (
        <ErrorState message={error} onRetry={loadTransactions} />
      ) : loading && transactions.length === 0 ? (
        <LoadingState label={t("transactions.loading")} />
      ) : filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("transactions.noResults")}
        </div>
      ) : (
        <TransactionTable
          transactions={filteredTransactions}
        />
      )}

      <SlipScanner open={isScannerOpen} onClose={() => setIsScannerOpen(false)} />

    </div>
  );
}
