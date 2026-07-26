import {
  Search,
  RotateCcw,
  Filter,
} from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  search: string;
  setSearch: (value: string) => void;

  filterType: string;
  setFilterType: (value: string) => void;

  filterCategory: string;
  setFilterCategory: (value: string) => void;

  filterAccount: string;
  setFilterAccount: (value: string) => void;

  filterDateFrom: string;
  setFilterDateFrom: (value: string) => void;

  filterDateTo: string;
  setFilterDateTo: (value: string) => void;

  categoryNames: string[];
  accountNames: string[];

  total: number;
}

export default function TransactionToolbar({
  search,
  setSearch,
  filterType,
  setFilterType,
  filterCategory,
  setFilterCategory,
  filterAccount,
  setFilterAccount,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  categoryNames,
  accountNames,
  total,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-lg font-semibold">
            {t("transactions.filters")}
          </h2>

          <p className="text-sm text-zinc-600 dark:text-zinc-500">
            {t("transactions.transactionsCount", { count: total })}
          </p>

        </div>

        <Filter
          size={20}
          className="text-zinc-600 dark:text-zinc-500"
        />

      </div>

      {/* Controls */}

      <div className="flex flex-wrap gap-4">

        {/* Search */}

        <div className="relative min-w-[260px] flex-1">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-500"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder={t("transactions.searchPlaceholder")}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-3 pl-10 pr-4 outline-none transition focus:border-brand-500"
          />

        </div>

        {/* Type */}

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value)
          }
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 outline-none transition focus:border-brand-500"
        >
          <option value="all">
            {t("common.all")}
          </option>

          <option value="income">
            {t("transactions.income")}
          </option>

          <option value="expense">
            {t("transactions.expense")}
          </option>

          <option value="transfer">
            {t("transactions.transfer")}
          </option>

          <option value="refund">
            {t("transactions.refund")}
          </option>

          <option value="adjustment">
            {t("transactions.adjustment")}
          </option>
        </select>

        {/* Category */}

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 outline-none transition focus:border-brand-500"
        >
          <option value="all">
            {t("transactions.allCategories")}
          </option>

          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* Account */}

        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 outline-none transition focus:border-brand-500"
        >
          <option value="all">
            {t("transactions.allAccounts")}
          </option>

          {accountNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* Date range */}

        <label className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-500">{t("transactions.dateFrom")}</span>
          <input
            type="date"
            aria-label={t("transactions.dateFrom")}
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            max={filterDateTo || undefined}
            className="w-0 min-w-[8.5rem] bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-500">{t("transactions.dateTo")}</span>
          <input
            type="date"
            aria-label={t("transactions.dateTo")}
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            min={filterDateFrom || undefined}
            className="w-0 min-w-[8.5rem] bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>

        {/* Reset */}

        <button
          onClick={() => {
            setSearch("");
            setFilterType("all");
            setFilterCategory("all");
            setFilterAccount("all");
            setFilterDateFrom("");
            setFilterDateTo("");
          }}
          className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <RotateCcw size={16} />
          {t("common.reset")}
        </button>

      </div>

    </div>
  );
}
