import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";

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
}

export default function SummaryCardsGrid({
  balance,
  income,
  expense,
  saving,
  changes,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

      <SummaryCard
        title={t("dashboard.income")}
        value={`฿${income.toLocaleString()}`}
        color="#16a34a"
        icon={<ArrowUpRight size={22} />}
        change={changes?.income}
      />

      <SummaryCard
        title={t("dashboard.expense")}
        value={`฿${expense.toLocaleString()}`}
        color="#dc2626"
        icon={<ArrowDownRight size={22} />}
        change={changes?.expense}
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
      />

    </div>
  );
}
