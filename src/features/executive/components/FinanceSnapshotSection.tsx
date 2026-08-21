import { Link } from "react-router-dom";
import { Wallet, PiggyBank, Scale } from "lucide-react";

import SummaryCard from "@/components/ui/SummaryCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { ExecutiveFinanceSnapshot } from "@/features/executive/types";

interface Props {
  finance: ExecutiveFinanceSnapshot;
}

function formatMoney(value: number): string {
  return `฿${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function FinanceSnapshotSection({ finance }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("executive.finance.title")}</h2>
        <Link to="/finance" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          <Wallet size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          title={t("executive.finance.netWorth")}
          value={formatMoney(finance.netWorth)}
          icon={<Scale size={20} />}
          color="#2563eb"
        />

        <SummaryCard
          title={t("executive.finance.budgetUsage")}
          value={finance.overallBudgetPercentage === null ? "—" : `${finance.overallBudgetPercentage.toFixed(0)}%`}
          icon={<PiggyBank size={20} />}
          color={finance.budgetsOverCount > 0 ? "#dc2626" : "#16a34a"}
        />
      </div>

      {finance.budgetsTrackedCount === 0 && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{t("executive.finance.noBudget")}</p>
      )}
    </div>
  );
}
