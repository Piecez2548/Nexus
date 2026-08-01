import { PiggyBank } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { STATUS_COLOR } from "@/features/finance/constants/budgetStatus";
import { useTranslation } from "@/i18n/useTranslation";
import type { BudgetAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/budgetAnalysis";

interface Props {
  result: BudgetAnalysisResult;
}

const STATUS_LABEL_KEY: Record<"ok" | "near" | "over", string> = {
  ok: "aiAnalytics.budgetAnalysis.statusOk",
  near: "aiAnalytics.budgetAnalysis.statusNear",
  over: "aiAnalytics.budgetAnalysis.statusOver",
};

const STATUS_BADGE_CLASS: Record<"ok" | "near" | "over", string> = {
  ok: "bg-green-500/15 text-green-500",
  near: "bg-amber-500/15 text-amber-500",
  over: "bg-red-500/15 text-red-500",
};

export default function BudgetAnalysisSection({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PiggyBank size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.budgetAnalysis.title")}</h2>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="mb-4 flex gap-4 text-sm">
          <span className="text-green-500">{t("aiAnalytics.budgetAnalysis.statusOk")}: {result.okCount}</span>
          <span className="text-amber-500">{t("aiAnalytics.budgetAnalysis.statusNear")}: {result.nearCount}</span>
          <span className="text-red-500">{t("aiAnalytics.budgetAnalysis.statusOver")}: {result.overCount}</span>
        </div>

        {result.entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.budgetAnalysis.noBudgets")}</p>
        ) : (
          <div className="space-y-4">
            {result.entries.map((entry) => (
              <div key={entry.budget.id} className="border-b border-zinc-200 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{entry.budget.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[entry.status]}`}>
                    {t(STATUS_LABEL_KEY[entry.status])}
                  </span>
                </div>
                <ProgressBar percentage={entry.percentage} colorClass={STATUS_COLOR[entry.status]} />
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>฿{entry.spent.toLocaleString()} / ฿{entry.budget.amount.toLocaleString()}</span>
                  {entry.potentialMonthlySavings !== null && (
                    <span className="text-red-400">{t("aiAnalytics.budgetAnalysis.potentialSavings", { amount: entry.potentialMonthlySavings.toLocaleString() })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
