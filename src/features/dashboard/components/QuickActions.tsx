import { Plus, TrendingUp } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  onAddTransaction: () => void;
  onViewTransactions: () => void;
}

export default function QuickActions({ onAddTransaction, onViewTransactions }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">

      <h2 className="mb-6 text-xl font-semibold">
        {t("dashboard.quickActions")}
      </h2>

      <div className="space-y-3">

        <button
          onClick={onAddTransaction}
          className="flex w-full items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <Plus size={20} />
          {t("transactions.addTransaction")}
        </button>

        <button
          onClick={onViewTransactions}
          className="flex w-full items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <TrendingUp size={20} />
          {t("transactions.viewAllTransactions")}
        </button>

      </div>

    </div>
  );
}
