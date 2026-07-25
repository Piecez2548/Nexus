import { useExpenseByCategory } from "@/features/dashboard/hooks/useExpenseByCategory";
import ProgressBar from "@/components/ui/ProgressBar";
import { useTranslation } from "@/i18n/useTranslation";

export default function CategoryBreakdownTable() {
  const data = useExpenseByCategory();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-5 text-lg font-semibold">{t("dashboard.expenseByCategory")}</h2>

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">
          {t("dashboard.noExpenseData")}
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((item) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;

            return (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-zinc-600 dark:text-zinc-500">
                    ฿{item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>

                <ProgressBar percentage={percentage} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
