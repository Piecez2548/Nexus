import { PieChart } from "lucide-react";
import ChartCard from "@/components/ui/ChartCard";
import TopCategoriesList from "@/features/finance/aiAnalytics/components/spendingAnalysis/TopCategoriesList";
import CategoryComparisonChart from "@/features/finance/aiAnalytics/components/spendingAnalysis/CategoryComparisonChart";
import MonthlyTrendChart from "@/features/finance/aiAnalytics/components/spendingAnalysis/MonthlyTrendChart";
import DailyTrendChart from "@/features/finance/aiAnalytics/components/spendingAnalysis/DailyTrendChart";
import WeeklyTrendChart from "@/features/finance/aiAnalytics/components/spendingAnalysis/WeeklyTrendChart";
import WeekdayAnalysisChart from "@/features/finance/aiAnalytics/components/spendingAnalysis/WeekdayAnalysisChart";
import LargestTransactionsList from "@/features/finance/aiAnalytics/components/spendingAnalysis/LargestTransactionsList";
import TransactionStatisticsCard from "@/features/finance/aiAnalytics/components/spendingAnalysis/TransactionStatisticsCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { SpendingAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/spendingAnalysis";
import type { LargePurchaseEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";
import type { TransactionStatistics } from "@/features/finance/aiAnalytics/engine/analyzers/transactionStatistics";

interface Props {
  result: SpendingAnalysisResult;
  largePurchases: LargePurchaseEntry[];
  statistics: TransactionStatistics;
  onSelectCategory: (category: string) => void;
}

export default function SpendingAnalysisSection({ result, largePurchases, statistics, onSelectCategory }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PieChart size={20} className="text-violet-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.spendingAnalysis.title")}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={t("aiAnalytics.spendingAnalysis.topCategories")}>
          <TopCategoriesList categories={result.topCategories} onSelectCategory={onSelectCategory} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.categoryComparison")}>
          <CategoryComparisonChart entries={result.categoryComparison} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.monthlyTrend")}>
          <MonthlyTrendChart monthlyTrend={result.monthlyTrend} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.weeklyTrend")}>
          <WeeklyTrendChart weeklyTrend={result.weeklyTrend} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.dailyTrend")}>
          <DailyTrendChart dailyTrend={result.dailyTrend} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.weekdayAnalysis")}>
          <WeekdayAnalysisChart weekdayAnalysis={result.weekdayAnalysis} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.largestTransactions")}>
          <LargestTransactionsList purchases={largePurchases} />
        </ChartCard>

        <ChartCard title={t("aiAnalytics.spendingAnalysis.statisticsTitle")}>
          <TransactionStatisticsCard statistics={statistics} />
        </ChartCard>
      </div>
    </div>
  );
}
