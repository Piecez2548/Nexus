import { useCallback, useEffect, useMemo, useState } from "react";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useGoalMilestoneEventStore } from "@/features/finance/store/goalMilestoneEventStore";
import { useFinancialAnalysis } from "@/features/finance/aiAnalytics/hooks/useFinancialAnalysis";
import { useCategoryDetail } from "@/features/finance/aiAnalytics/hooks/useCategoryDetail";
import { useFinancialHealthTrend } from "@/features/finance/aiAnalytics/hooks/useFinancialHealthTrend";

import AiCoachSection from "@/features/finance/aiAnalytics/components/aiCoach/AiCoachSection";
import FinancialHealthScoreSection from "@/features/finance/aiAnalytics/components/financialHealthScore/FinancialHealthScoreSection";
import ExecutiveSummarySection from "@/features/finance/aiAnalytics/components/executiveSummary/ExecutiveSummarySection";
import AiInsightsPanel from "@/features/finance/aiAnalytics/components/AiInsightsPanel";
import SpendingAnalysisSection from "@/features/finance/aiAnalytics/components/SpendingAnalysisSection";
import BehaviorAnalysisSection from "@/features/finance/aiAnalytics/components/BehaviorAnalysisSection";
import BehaviorProfileSection from "@/features/finance/aiAnalytics/components/behaviorProfile/BehaviorProfileSection";
import MerchantAnalysisSection from "@/features/finance/aiAnalytics/components/merchantAnalysis/MerchantAnalysisSection";
import BudgetAnalysisSection from "@/features/finance/aiAnalytics/components/BudgetAnalysisSection";
import CashFlowAnalysisSection from "@/features/finance/aiAnalytics/components/CashFlowAnalysisSection";
import ForecastSection from "@/features/finance/aiAnalytics/components/forecast/ForecastSection";
import RecommendationsSection from "@/features/finance/aiAnalytics/components/RecommendationsSection";
import FinancialTimelineSection from "@/features/finance/aiAnalytics/components/FinancialTimelineSection";
import CategoryInsightsDrawer from "@/features/finance/aiAnalytics/components/categoryDetail/CategoryInsightsDrawer";

import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function AiAnalytics() {
  const { loadTransactions, error: transactionsError } = useTransactionStore();
  const { loadBudgets, error: budgetsError } = useBudgetStore();
  const { loadCategories, error: categoriesError } = useCategoryStore();
  const { loadGoals, error: goalsError } = useGoalStore();
  const { loadProfiles, error: profilesError } = useRecipientProfileStore();
  const { loadEvents, error: eventsError } = useGoalMilestoneEventStore();

  const { t } = useTranslation();
  // One shared `now`, memoized once per mount, so the main analysis and the
  // trend's own "current" point score the same instant (PERF-003) -- two
  // independent `new Date()` calls could otherwise land a tick apart and
  // (in principle) disagree if a transaction changed in between, on top of
  // being wasted duplicate work for what should be the same result.
  const now = useMemo(() => new Date(), []);
  const { data, loading, error: analysisError, retry } = useFinancialAnalysis(undefined, now);
  // A failed store load previously fell through to the empty state below
  // (analysisError only ever reflects the analysis engine itself, never a
  // load failure) -- a person would see "no data" when the real problem was
  // a broken fetch. Surfaced as the same ErrorState the analysis error uses.
  const error = analysisError ?? transactionsError ?? budgetsError ?? categoriesError ?? goalsError ?? profilesError ?? eventsError;
  const trendPoints = useFinancialHealthTrend(now);
  // Category Insights drawer: local page state, not the shared finance
  // uiStore — this only ever opens from this one page, unlike the
  // Transaction/Trade drawers, which are triggered from several pages.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoryDetail = useCategoryDetail(selectedCategory);

  // The page owns load orchestration (the hooks read the stores but never
  // fetch them). Shared by mount and retry so the retry re-fetches the
  // finance data before re-analysing — recovering from a transient
  // data-load failure, not just re-running the analysis (UX-002).
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("aiAnalytics.pageTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.pageSubtitle")}</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={handleRetry} />
      ) : loading && !data ? (
        <LoadingState label={t("aiAnalytics.loading")} />
      ) : !data || data.meta.transactionCount === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("aiAnalytics.emptyState")}
        </div>
      ) : (
        <div className="space-y-8">
          <AiCoachSection data={data} />
          <FinancialHealthScoreSection result={data.financialHealthScore} trendPoints={trendPoints} />
          <ExecutiveSummarySection result={data.executiveSummaryReport} />
          <AiInsightsPanel insights={data.insights} />
          <SpendingAnalysisSection
            result={data.spendingAnalysis}
            largePurchases={data.behaviorAnalysis.largePurchases}
            statistics={data.transactionStatistics}
            onSelectCategory={setSelectedCategory}
          />
          <BehaviorAnalysisSection result={data.behaviorAnalysis} />
          <BehaviorProfileSection result={data.behaviorProfile} dailyTrend={data.spendingAnalysis.dailyTrend} now={new Date(data.meta.generatedAt)} />
          <MerchantAnalysisSection merchants={data.behaviorAnalysis.topMerchants} />
          <BudgetAnalysisSection result={data.budgetAnalysis} />
          <CashFlowAnalysisSection result={data.cashFlowAnalysis} />
          <ForecastSection
            result={data.forecastProfile}
            monthlyTrend={data.cashFlowAnalysis.monthlyTrend}
            goalProgress={data.goalProgress}
            spendingAnalysis={data.spendingAnalysis}
            subscriptions={data.behaviorAnalysis.subscriptions}
            now={new Date(data.meta.generatedAt)}
          />
          <RecommendationsSection recommendations={data.actionableRecommendations} />
          <FinancialTimelineSection events={data.timeline} />
        </div>
      )}

      <CategoryInsightsDrawer open={selectedCategory !== null} onClose={() => setSelectedCategory(null)} result={categoryDetail} />
    </div>
  );
}
