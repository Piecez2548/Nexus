import { Pencil, Trash2 } from "lucide-react";

import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import IconBadge from "@/components/ui/IconBadge";
import { useTranslation } from "@/i18n/useTranslation";
import type { NetWorthItem } from "@/features/finance/types";

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  cash: "netWorth.categories.cash",
  bank: "netWorth.categories.bank",
  investment: "netWorth.categories.investment",
  property: "netWorth.categories.property",
  vehicle: "netWorth.categories.vehicle",
  crypto: "netWorth.categories.crypto",
  creditCard: "netWorth.categories.creditCard",
  loan: "netWorth.categories.loan",
  mortgage: "netWorth.categories.mortgage",
  other: "netWorth.categories.other",
};

interface Props {
  title: string;
  emptyLabel: string;
  items: NetWorthItem[];
  total: number;
  onEdit: (item: NetWorthItem) => void;
}

export default function NetWorthItemSection({ title, emptyLabel, items, total, onEdit }: Props) {
  const { deleteItem } = useNetWorthItemStore();
  const toast = useToast();
  const { t } = useTranslation();

  async function handleDelete(item: NetWorthItem) {
    if (item.id === undefined) return;

    try {
      await deleteItem(item.id);
      toast.success(t("netWorth.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="font-semibold">฿{total.toLocaleString()}</span>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((item) => {
            const Icon = getIcon(item.icon);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
              >
                <div className="flex items-center gap-3">
                  <IconBadge icon={<Icon size={18} />} color={item.color} />

                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-500">
                      {t(CATEGORY_LABEL_KEYS[item.category] ?? "netWorth.categories.other")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-medium">฿{item.value.toLocaleString()}</span>

                  <button
                    onClick={() => onEdit(item)}
                    aria-label={`Edit ${item.name}`}
                    className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(item)}
                    aria-label={`Delete ${item.name}`}
                    className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
