import { Plus, BookOpen } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  onAddTrade: () => void;
  onViewJournal: () => void;
}

export default function TradingQuickActions({ onAddTrade, onViewJournal }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-6 text-xl font-semibold">{t("trading.quickActions")}</h2>

      <div className="space-y-3">
        <button
          onClick={onAddTrade}
          className="flex w-full items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <Plus size={20} />
          {t("trading.addTrade")}
        </button>

        <button
          onClick={onViewJournal}
          className="flex w-full items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-4 transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <BookOpen size={20} />
          {t("trading.viewJournal")}
        </button>
      </div>
    </div>
  );
}
