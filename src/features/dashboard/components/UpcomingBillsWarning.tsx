import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import {
  projectAccountShortfalls,
  projectUpcomingCashFlow,
  UPCOMING_HORIZON_DAYS,
} from "@/features/finance/utils/upcomingCashFlow";
import { useTranslation } from "@/i18n/useTranslation";
import type { Transaction } from "@/features/finance/types";

const baht = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

// Renders nothing unless active subscriptions due soon would push the
// overall balance below zero -- same "quiet until there's something worth
// showing" precedent as BackupReminderCard. The math lives in
// projectUpcomingCashFlow; this only formats it.
export default function UpcomingBillsWarning({
  balance,
  transactions,
}: {
  balance: number;
  transactions: Transaction[];
}) {
  const { t } = useTranslation();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const loadSubscriptions = useSubscriptionStore((s) => s.loadSubscriptions);

  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);

  useEffect(() => {
    void loadSubscriptions();
    void loadAccounts();
  }, [loadSubscriptions, loadAccounts]);

  const { upcomingExpense, upcomingIncome, projectedBalance } = projectUpcomingCashFlow(subscriptions, balance);
  const overallShort = upcomingExpense > 0 && projectedBalance < 0;
  const accountShortfalls = projectAccountShortfalls(subscriptions, accounts, transactions);
  if (!overallShort && accountShortfalls.length === 0) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30"
    >
      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />

      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{t("dashboard.billsWarningTitle")}</h2>
        {overallShort && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("dashboard.billsWarningBody", {
              days: UPCOMING_HORIZON_DAYS,
              expense: baht(upcomingExpense),
              income: baht(upcomingIncome),
              balance: baht(balance),
              projected: baht(projectedBalance),
            })}
          </p>
        )}
        {accountShortfalls.length > 0 && (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            {accountShortfalls.map((item) => (
              <li key={item.account}>
                {t("dashboard.billsWarningAccount", {
                  account: item.account,
                  short: baht(-item.projectedBalance),
                  balance: baht(item.balance),
                  expense: baht(item.upcomingExpense),
                })}
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/subscriptions"
          className="mt-3 inline-block rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700"
        >
          {t("dashboard.billsWarningAction")}
        </Link>
      </div>
    </div>
  );
}
