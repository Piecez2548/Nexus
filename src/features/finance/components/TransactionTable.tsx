import { useMemo, useState } from "react";
import { Pencil, Trash2, Star, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useUIStore } from "@/features/finance/store/uiStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import IconBadge from "@/components/ui/IconBadge";
import MobileRowCard from "@/components/ui/MobileRowCard";
import type { Transaction, TransactionType } from "@/features/finance/types";

interface Props {
  transactions?: Transaction[];
}

const TYPE_META: Record<TransactionType, { label: string; textClass: string; badgeClass: string }> = {
  income: { label: "Income", textClass: "text-green-400", badgeClass: "bg-green-500/15 text-green-400" },
  expense: { label: "Expense", textClass: "text-red-400", badgeClass: "bg-red-500/15 text-red-400" },
  transfer: { label: "Transfer", textClass: "text-violet-400", badgeClass: "bg-violet-500/15 text-violet-400" },
  refund: { label: "Refund", textClass: "text-teal-400", badgeClass: "bg-teal-500/15 text-teal-400" },
  adjustment: { label: "Adjustment", textClass: "text-amber-400", badgeClass: "bg-amber-500/15 text-amber-400" },
};

type SortKey = "date" | "title" | "category" | "account" | "amount" | "type";

function sortValue(item: Transaction, key: SortKey): string | number {
  switch (key) {
    case "date":
      return item.date;
    case "title":
      return item.title.toLowerCase();
    case "category":
      return (item.category ?? "").toLowerCase();
    case "account":
      return item.account.toLowerCase();
    case "amount":
      return item.amount;
    case "type":
      return item.type;
  }
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export default function TransactionTable({
  transactions: propTransactions,
}: Props) {
  const {
    transactions: storeTransactions,
    deleteTransaction,
    toggleFavorite,
  } = useTransactionStore();

  const { openTransactionDrawer } = useUIStore();
  const { categories } = useCategoryStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // `null` = no column selected yet, the default view: sorted by insertion
  // order (most-recently-added first), using the existing Dexie
  // auto-increment `id` rather than a dedicated "date added" field.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toast = useToast();

  const unsortedTransactions =
    propTransactions ?? storeTransactions;

  const transactions = useMemo(() => {
    if (sortKey === null) {
      return [...unsortedTransactions].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...unsortedTransactions].sort(
      (a, b) => compareValues(sortValue(a, sortKey), sortValue(b, sortKey)) * dir
    );
  }, [unsortedTransactions, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortHeader({ label, sortKeyName, align = "left" }: { label: string; sortKeyName: SortKey; align?: "left" | "right" | "center" }) {
    const alignClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
    const Icon = sortKey !== sortKeyName ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;

    return (
      <th className={`px-6 py-4 text-${align}`}>
        <button
          type="button"
          onClick={() => toggleSort(sortKeyName)}
          className={`flex w-full items-center gap-1 ${alignClass} transition hover:text-violet-500`}
        >
          {label}
          <Icon size={13} />
        </button>
      </th>
    );
  }

  function categoryMeta(categoryName?: string) {
    const category = categories.find((c) => c.name === categoryName);
    return {
      Icon: getIcon(category?.icon ?? ""),
      color: category?.color ?? "#71717a",
    };
  }

  async function handleDelete(item: Transaction) {
    if (item.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteTransaction(item.id);
      toast.success("ลบรายการเรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  async function handleToggleFavorite(item: Transaction) {
    try {
      setDeleteError(null);
      await toggleFavorite(item);
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            ยังไม่มีรายการ
          </h2>

          <p className="mt-2 text-zinc-600 dark:text-zinc-500">
            กดปุ่ม Add Transaction เพื่อเริ่มต้น
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>

      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {transactions.map((item) => {
          const meta = TYPE_META[item.type];
          const { Icon, color } = categoryMeta(item.category);

          return (
            <MobileRowCard
              key={item.id}
              leading={<IconBadge icon={<Icon size={16} />} color={color} size={36} />}
              title={item.title}
              subtitle={
                item.type === "transfer"
                  ? `→ ${item.toAccount ?? "-"}`
                  : `${item.category ?? "-"} · ${item.account}`
              }
              trailing={
                <span className={`text-base font-bold ${meta.textClass}`}>
                  ฿{item.amount.toLocaleString()}
                </span>
              }
              meta={
                <>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(item.date).toLocaleDateString("th-TH")}
                  </span>
                </>
              }
              actions={
                <>
                  <button
                    onClick={() => handleToggleFavorite(item)}
                    aria-label={item.favorite ? `Unfavorite ${item.title}` : `Favorite ${item.title}`}
                    aria-pressed={Boolean(item.favorite)}
                    className={`rounded-lg p-2 transition hover:bg-amber-500/20 hover:text-amber-400 ${
                      item.favorite ? "text-amber-400" : ""
                    }`}
                  >
                    <Star size={16} fill={item.favorite ? "currentColor" : "none"} />
                  </button>

                  <button
                    onClick={() => openTransactionDrawer(item)}
                    aria-label={`Edit ${item.title}`}
                    className="rounded-lg p-2 transition hover:bg-violet-600/20 hover:text-violet-400"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.title}`}
                    className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              }
            />
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg md:block">

      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950">

            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">

              <SortHeader label="Date" sortKeyName="date" />
              <SortHeader label="Title" sortKeyName="title" />
              <SortHeader label="Category" sortKeyName="category" />
              <SortHeader label="Account" sortKeyName="account" />
              <SortHeader label="Amount" sortKeyName="amount" align="right" />
              <SortHeader label="Type" sortKeyName="type" align="center" />
              <th className="px-6 py-4 text-center">Action</th>

            </tr>

          </thead>

          <tbody>

            {transactions.map((item) => {
              const meta = TYPE_META[item.type];
              const { Icon, color } = categoryMeta(item.category);

              return (
                <tr
                  key={item.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                >

                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                    {new Date(item.date).toLocaleDateString("th-TH")}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <IconBadge icon={<Icon size={16} />} color={color} size={32} />

                      <div className="font-medium">
                        {item.title}
                        {item.tags && item.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                    {item.type === "transfer"
                      ? `→ ${item.toAccount ?? "-"}`
                      : item.category ?? "-"}
                  </td>

                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                    {item.account}
                  </td>

                  <td className={`px-6 py-4 text-right text-lg font-bold ${meta.textClass}`}>
                    ฿{item.amount.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </td>

                  <td className="px-6 py-4">

                    <div className="flex justify-center gap-3">

                      <button
                        onClick={() => handleToggleFavorite(item)}
                        aria-label={item.favorite ? `Unfavorite ${item.title}` : `Favorite ${item.title}`}
                        aria-pressed={Boolean(item.favorite)}
                        className={`rounded-lg p-2 transition hover:bg-amber-500/20 hover:text-amber-400 ${
                          item.favorite ? "text-amber-400" : ""
                        }`}
                      >
                        <Star size={18} fill={item.favorite ? "currentColor" : "none"} />
                      </button>

                      <button
                        onClick={() => openTransactionDrawer(item)}
                        aria-label={`Edit ${item.title}`}
                        className="rounded-lg p-2 transition hover:bg-violet-600/20 hover:text-violet-400"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        aria-label={`Delete ${item.title}`}
                        className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>

                    </div>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

      </div>

    </div>
  );
}
