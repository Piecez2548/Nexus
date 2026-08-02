import ChartCard from "@/components/ui/ChartCard";
import ChartLegend from "@/components/ui/ChartLegend";
import InfoTooltip from "@/components/ui/InfoTooltip";
import ExpensePieChart from "@/features/dashboard/components/charts/ExpensePieChart";
import CashFlowLineChart from "@/features/dashboard/components/charts/CashFlowLineChart";
import { useTranslation } from "@/i18n/useTranslation";
import type { DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";

interface Props {
  granularity?: DashboardPeriodGranularity;
}

export default function CashFlowSection({ granularity }: Props) {
  const { t } = useTranslation();

  const cashFlowLegend = [
    { label: t("dashboard.income"), color: "#22c55e" },
    { label: t("dashboard.expense"), color: "#ef4444" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-3">

      <div className="xl:col-span-2">

        <ChartCard
          title={t("dashboard.incomeVsExpense")}
          headerExtra={
            <div className="flex items-center gap-3">
              <ChartLegend items={cashFlowLegend} />
              <InfoTooltip text={t("dashboard.info.incomeVsExpense")} />
            </div>
          }
        >
          <CashFlowLineChart granularity={granularity} />
        </ChartCard>

      </div>

      <ChartCard
        title={t("dashboard.expenseByCategoryTitle")}
        headerExtra={<InfoTooltip text={t("dashboard.info.expenseByCategory")} />}
      >
        <ExpensePieChart granularity={granularity} />
      </ChartCard>

    </div>
  );
}
