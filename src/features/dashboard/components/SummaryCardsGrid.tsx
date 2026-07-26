import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { DashboardPeriodGranularity } from "@/features/dashboard/utils/dashboardPeriodRange";

interface Changes {
  balance: number | null;
  income: number | null;
  expense: number | null;
  saving: number | null;
}

interface Props {
  balance: number;
  income: number;
  expense: number;
  saving: number;
  changes?: Changes;
  // Optional: only the Dashboard page's period selector passes this. When
  // omitted (e.g. the separate Finance Dashboard page), every card's change
  // caption stays "vs last month" — its original, unchanged behavior.
  granularity?: DashboardPeriodGranularity;
}

const PERIOD_CHANGE_LABEL_KEYS: Record<DashboardPeriodGranularity, string> = {
  day: "dashboard.vsPreviousDay",
  month: "dashboard.vsLastMonth",
  year: "dashboard.vsPreviousYear",
};

export default function SummaryCardsGrid({
  balance,
  income,
  expense,
  saving,
  changes,
  granularity,
}: Props) {
  const { t } = useTranslation();
  const periodChangeLabel = t(granularity ? PERIOD_CHANGE_LABEL_KEYS[granularity] : "dashboard.vsLastMonth");

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

      <SummaryCard
        title={t("dashboard.income")}
        value={`฿${income.toLocaleString()}`}
        color="#16a34a"
        icon={<ArrowUpRight size={22} />}
        change={changes?.income}
        changeLabel={periodChangeLabel}
      />

      <SummaryCard
        title={t("dashboard.expense")}
        value={`฿${expense.toLocaleString()}`}
        color="#dc2626"
        icon={<ArrowDownRight size={22} />}
        change={changes?.expense}
        changeLabel={periodChangeLabel}
        invertChange
      />

      <SummaryCard
        title={t("dashboard.balance")}
        value={`฿${balance.toLocaleString()}`}
        color="#2563eb"
        icon={<Wallet size={22} />}
        change={changes?.balance}
      />

      <SummaryCard
        title={t("dashboard.savings")}
        value={`฿${saving.toLocaleString()}`}
        color="#ca8a04"
        icon={<PiggyBank size={22} />}
        change={changes?.saving}
        changeLabel={periodChangeLabel}
      />

    </div>
  );
}
