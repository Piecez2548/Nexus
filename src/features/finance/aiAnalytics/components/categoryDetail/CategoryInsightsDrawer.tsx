import Drawer from "@/components/ui/Drawer";
import CategoryMonthlyTrendChart from "@/features/finance/aiAnalytics/components/categoryDetail/CategoryMonthlyTrendChart";
import CategoryTransactionList from "@/features/finance/aiAnalytics/components/categoryDetail/CategoryTransactionList";
import { useTranslation } from "@/i18n/useTranslation";
import type { CategoryDetailResult } from "@/features/finance/aiAnalytics/engine/analyzers/categoryDetail";

interface Props {
  open: boolean;
  onClose: () => void;
  result: CategoryDetailResult | null;
}

// Local page state, not the shared finance uiStore (see AiAnalytics.tsx) —
// this only ever opens from the Spending Analysis section on this one page.
export default function CategoryInsightsDrawer({ open, onClose, result }: Props) {
  const { t } = useTranslation();

  return (
    <Drawer open={open} onClose={onClose}>
      {result && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">{t("aiAnalytics.categoryDetail.title", { category: result.category })}</h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.totalSpent")}</p>
              <p className="mt-1 font-semibold">฿{result.totalSpent.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.averagePerPurchase")}</p>
              <p className="mt-1 font-semibold">฿{Math.round(result.averagePerPurchase).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.averagePerDay")}</p>
              <p className="mt-1 font-semibold">฿{Math.round(result.averagePerDay).toLocaleString()}</p>
            </div>
          </div>

          {result.recommendation && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <p className="text-sm">{t(`aiAnalytics.categoryDetail.recommendations.${result.recommendation.key}`, result.recommendation.params)}</p>
              {result.potentialSavings !== null && (
                <p className="mt-1 text-sm font-semibold text-green-500">
                  {t("aiAnalytics.budgetAnalysis.potentialSavings", { amount: result.potentialSavings.toLocaleString() })}
                </p>
              )}
            </div>
          )}

          {result.topMerchant && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.topMerchant")}</h3>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{result.topMerchant.alias}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t("aiAnalytics.behaviorAnalysis.transactionsCount", { count: result.topMerchant.transactionCount })}
                  </p>
                </div>
                <span className="font-semibold">฿{result.topMerchant.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.monthlyTrend")}</h3>
            <CategoryMonthlyTrendChart monthlyTrend={result.monthlyTrend} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.transactions")}</h3>
            <CategoryTransactionList transactions={result.transactions} />
          </div>
        </div>
      )}
    </Drawer>
  );
}
