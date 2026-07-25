import { Receipt } from "lucide-react";

import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { getIcon } from "@/features/finance/constants/icons";
import IconBadge from "@/components/ui/IconBadge";
import { useTranslation } from "@/i18n/useTranslation";
import type { Transaction } from "@/features/finance/types";

interface Props {
  transactions: Transaction[];
}

export default function RecentTransactionsList({ transactions }: Props) {
  const { categories } = useCategoryStore();
  const recent = transactions.slice(0, 5);
  const { t } = useTranslation();

  function categoryMeta(categoryName?: string) {
    const category = categories.find((c) => c.name === categoryName);
    return {
      Icon: getIcon(category?.icon ?? ""),
      color: category?.color ?? "#71717a",
    };
  }

  return (
    <div className="xl:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">

      <div className="mb-5 flex items-center justify-between">

        <h2 className="text-xl font-semibold">
          {t("dashboard.recentTransactions")}
        </h2>

        <Receipt
          size={20}
          className="text-zinc-600 dark:text-zinc-500"
        />

      </div>

      {recent.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">
          {t("dashboard.noTransactionsYet")}
        </div>
      ) : (
        <div className="space-y-4">

          {recent.map((item) => {
            const { Icon, color } = categoryMeta(item.category);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
              >

                <div className="flex items-center gap-3">

                  <IconBadge icon={<Icon size={18} />} color={color} size={36} />

                  <div>

                    <div className="font-medium">
                      {item.title}
                    </div>

                    <div className="text-sm text-zinc-600 dark:text-zinc-500">
                      {item.category}
                    </div>

                  </div>

                </div>

                <div
                  className={
                    item.type === "income"
                      ? "font-semibold text-green-400"
                      : "font-semibold text-red-400"
                  }
                >
                  ฿{item.amount.toLocaleString()}
                </div>

              </div>
            );

          })}

        </div>
      )}

    </div>
  );
}
