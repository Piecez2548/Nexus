import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";
import type { TopCategoryEntry } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";

interface Props {
  categories: TopCategoryEntry[];
  onSelectCategory?: (category: string) => void;
}

export default function TopCategoriesList({ categories, onSelectCategory }: Props) {
  const { t } = useTranslation();

  if (categories.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.noData")}</p>;
  }

  return (
    <div className="space-y-3">
      {categories.slice(0, 8).map((c) => {
        const row = (
          <>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{c.category}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                ฿{c.amount.toLocaleString()} ({c.percentOfTotal.toFixed(1)}%)
              </span>
            </div>
            <ProgressBar percentage={c.percentOfTotal} />
          </>
        );

        return onSelectCategory ? (
          <button
            key={c.category}
            type="button"
            onClick={() => onSelectCategory(c.category)}
            className="w-full text-left transition hover:opacity-80"
          >
            {row}
          </button>
        ) : (
          <div key={c.category}>{row}</div>
        );
      })}
    </div>
  );
}
