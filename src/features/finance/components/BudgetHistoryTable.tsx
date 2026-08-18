import { useBudgetPeriodSnapshotStore } from "@/features/finance/store/budgetPeriodSnapshotStore";
import { getCurrentPeriodRange } from "@/features/finance/utils/periodRange";
import { toLocalDateString } from "@/utils/localDate";
import { useTranslation } from "@/i18n/useTranslation";
import type { BudgetPeriodSnapshotStatus } from "@/features/finance/types";

const STATUS_BADGE_CLASSES: Record<BudgetPeriodSnapshotStatus, string> = {
  ok: "bg-green-500/15 text-green-600 dark:text-green-400",
  near: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  over: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const MAX_ROWS = 12;

// Read-only, past-periods-only view of BudgetPeriodSnapshot -- the live
// current period is already shown by BudgetTable above this on the page.
export default function BudgetHistoryTable() {
  const { snapshots } = useBudgetPeriodSnapshotStore();
  const { t } = useTranslation();

  const currentPeriodStarts = new Set(
    (["monthly", "weekly", "yearly"] as const).map((period) => toLocalDateString(getCurrentPeriodRange(period).start))
  );

  const pastRows = snapshots
    .filter((s) => !currentPeriodStarts.has(s.periodStart))
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .slice(0, MAX_ROWS);

  if (pastRows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <h2 className="font-semibold">{t("budget.historyTitle")}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              <th className="px-6 py-3 text-left">{t("common.category")}</th>
              <th className="px-6 py-3 text-left">{t("budget.period")}</th>
              <th className="px-6 py-3 text-right">{t("budget.spentOfBudget")}</th>
              <th className="px-6 py-3 text-center">{t("budget.status")}</th>
            </tr>
          </thead>

          <tbody>
            {pastRows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
                <td className="px-6 py-3 font-medium">{row.category}</td>
                <td className="px-6 py-3 text-zinc-500 dark:text-zinc-400">{row.periodStart}</td>
                <td className="px-6 py-3 text-right text-zinc-700 dark:text-zinc-300">
                  ฿{row.spent.toLocaleString()} / ฿{row.amount.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[row.status]}`}>
                    {t(`budget.status${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
