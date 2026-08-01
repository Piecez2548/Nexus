import { useTranslation } from "@/i18n/useTranslation";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

interface Props {
  statistics: TransactionStatistics;
}

function StatTile({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold">฿{Math.round(amount).toLocaleString()}</p>
    </div>
  );
}

// Largest transaction is deliberately not repeated here — it's the same
// value as LargestTransactionsList's first row, shown once there rather
// than twice on this page. Smallest transaction has no other home, so it
// gets its own row below the averages.
export default function TransactionStatisticsCard({ statistics }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("aiAnalytics.spendingAnalysis.averageDailySpending")} amount={statistics.averageDailySpending} />
        <StatTile label={t("aiAnalytics.spendingAnalysis.averageWeeklySpending")} amount={statistics.averageWeeklySpending} />
        <StatTile label={t("aiAnalytics.spendingAnalysis.averageMonthlySpending")} amount={statistics.averageMonthlySpending} />
        <StatTile label={t("aiAnalytics.spendingAnalysis.averageTransaction")} amount={statistics.averageTransaction} />
      </div>

      {statistics.smallestTransaction && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.spendingAnalysis.smallestTransaction")}</p>
            <p className="text-sm font-medium">{statistics.smallestTransaction.title}</p>
          </div>
          <span className="text-sm font-semibold">฿{statistics.smallestTransaction.amount.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
