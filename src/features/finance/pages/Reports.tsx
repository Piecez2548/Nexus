import { useCallback, useEffect, useState } from "react";
import { FileText, FileSpreadsheet, FileDown } from "lucide-react";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { useFinancialAnalysis } from "@/features/finance/aiAnalytics/hooks/useFinancialAnalysis";
import { downloadFinancialSummaryPdf } from "@/features/finance/utils/financialSummaryPdf";
import { financialSummaryToCsv } from "@/features/finance/utils/financialSummaryCsv";
import { downloadAiAnalyticsReportPdf } from "@/features/finance/utils/aiAnalyticsReportPdf";
import { downloadFile } from "@/utils/download";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

type ReportType = "financialSummary" | "aiAnalytics";

export default function Reports() {
  const { loadTransactions } = useTransactionStore();
  const { loadBudgets } = useBudgetStore();
  const { loadCategories } = useCategoryStore();
  const { loadGoals } = useGoalStore();
  const { loadProfiles } = useRecipientProfileStore();
  const { loadEvents } = useGoalMilestoneEventStore();

  const { t } = useTranslation();
  const { data, loading, error, retry } = useFinancialAnalysis();
  const [reportType, setReportType] = useState<ReportType>("financialSummary");

  const loadAll = useCallback(() => {
    loadTransactions();
    loadBudgets();
    loadCategories();
    loadGoals();
    loadProfiles();
    loadEvents();
  }, [loadTransactions, loadBudgets, loadCategories, loadGoals, loadProfiles, loadEvents]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRetry = useCallback(() => {
    loadAll();
    retry();
  }, [loadAll, retry]);

  function handleFinancialSummaryPdf() {
    if (!data) return;
    downloadFinancialSummaryPdf({ monthlyTrend: data.cashFlowAnalysis.monthlyTrend, topCategories: data.spendingAnalysis.topCategories });
  }

  function handleFinancialSummaryCsv() {
    if (!data) return;
    const csv = financialSummaryToCsv({ monthlyTrend: data.cashFlowAnalysis.monthlyTrend, topCategories: data.spendingAnalysis.topCategories });
    downloadFile(`nexus-financial-summary-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8;");
  }

  function handleAiAnalyticsPdf() {
    if (!data) return;
    downloadAiAnalyticsReportPdf(
      { executiveSummaryReport: data.executiveSummaryReport, financialHealthScore: data.financialHealthScore },
      t
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("reports.pageTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("reports.pageSubtitle")}</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={handleRetry} />
      ) : loading && !data ? (
        <LoadingState label={t("reports.loading")} />
      ) : !data || data.meta.transactionCount === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("reports.emptyState")}
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setReportType("financialSummary")}
              className={`rounded-xl px-4 py-2 font-medium transition ${
                reportType === "financialSummary"
                  ? "bg-brand-600 text-zinc-900 dark:text-white"
                  : "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t("reports.financialSummary")}
            </button>

            <button
              type="button"
              onClick={() => setReportType("aiAnalytics")}
              className={`rounded-xl px-4 py-2 font-medium transition ${
                reportType === "aiAnalytics"
                  ? "bg-brand-600 text-zinc-900 dark:text-white"
                  : "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t("reports.aiAnalyticsReport")}
            </button>
          </div>

          {reportType === "financialSummary" ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h2 className="text-lg font-semibold">{t("reports.financialSummary")}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("reports.financialSummaryDescription")}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:w-64">
                <button
                  type="button"
                  onClick={handleFinancialSummaryPdf}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <FileText size={22} className="text-brand-500" />
                  <span className="text-sm font-medium">PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinancialSummaryCsv}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <FileSpreadsheet size={22} className="text-brand-500" />
                  <span className="text-sm font-medium">CSV</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h2 className="text-lg font-semibold">{t("reports.aiAnalyticsReport")}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("reports.aiAnalyticsReportDescription")}</p>

              <div className="mt-4 sm:w-32">
                <button
                  type="button"
                  onClick={handleAiAnalyticsPdf}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <FileDown size={22} className="text-brand-500" />
                  <span className="text-sm font-medium">PDF</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
