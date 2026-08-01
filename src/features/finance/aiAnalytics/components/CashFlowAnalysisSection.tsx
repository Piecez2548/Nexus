import { ArrowDownCircle, ArrowUpCircle, Wallet, Wallet2 } from "lucide-react";
import SummaryCard from "@/components/ui/SummaryCard";
import ChartCard from "@/components/ui/ChartCard";
import MonthlyTrendChart from "@/features/finance/aiAnalytics/components/spendingAnalysis/MonthlyTrendChart";
import { useTranslation } from "@/i18n/useTranslation";
import type { CashFlowAnalysisResult } from "@/features/finance/aiAnalytics/engine/analyzers/cashFlowAnalysis";

interface Props {
  result: CashFlowAnalysisResult;
}

export default function CashFlowAnalysisSection({ result }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet2 size={20} className="text-blue-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.cashFlowAnalysis.title")}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("aiAnalytics.cashFlowAnalysis.income")}
          value={`฿${result.income.toLocaleString()}`}
          icon={<ArrowUpCircle size={20} className="text-white" />}
          color="#22c55e"
          change={result.changeVsPreviousMonth.income}
        />
        <SummaryCard
          title={t("aiAnalytics.cashFlowAnalysis.expense")}
          value={`฿${result.expense.toLocaleString()}`}
          icon={<ArrowDownCircle size={20} className="text-white" />}
          color="#ef4444"
          change={result.changeVsPreviousMonth.expense}
          invertChange
        />
        <SummaryCard
          title={t("aiAnalytics.cashFlowAnalysis.saving")}
          value={`฿${result.saving.toLocaleString()}`}
          icon={<Wallet size={20} className="text-white" />}
          color="#8b5cf6"
          change={result.changeVsPreviousMonth.saving}
        />
        <SummaryCard
          title={t("aiAnalytics.cashFlowAnalysis.savingRate")}
          value={result.savingRatePercent === null ? "—" : `${result.savingRatePercent.toFixed(1)}%`}
          icon={<Wallet2 size={20} className="text-white" />}
          color="#3b82f6"
        />
      </div>

      <ChartCard title={t("aiAnalytics.cashFlowAnalysis.monthlyTrend")}>
        <MonthlyTrendChart monthlyTrend={result.monthlyTrend} />
      </ChartCard>
    </div>
  );
}
