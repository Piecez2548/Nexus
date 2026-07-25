import { Repeat } from "lucide-react";
import { useSubscriptions } from "@/features/finance/hooks/useSubscriptions";
import { useTranslation } from "@/i18n/useTranslation";

const FREQUENCY_LABEL_KEYS: Record<string, string> = {
  daily: "common.daily",
  weekly: "common.weekly",
  monthly: "common.monthly",
  yearly: "common.yearly",
};

export default function SubscriptionsSummaryPanel() {
  const { subscriptions, totalMonthly } = useSubscriptions();
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("financeDashboard.subscriptions")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("financeDashboard.subscriptionsDescription")}
          </p>
        </div>

        <Repeat size={20} className="text-zinc-500 dark:text-zinc-400" />
      </div>

      {subscriptions.length === 0 ? (
        <div className="py-8 text-center text-zinc-600 dark:text-zinc-500">
          {t("financeDashboard.noSubscriptions")}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.title}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 p-3"
              >
                <div>
                  <p className="font-medium">{sub.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t(FREQUENCY_LABEL_KEYS[sub.frequency])} · ฿{sub.amount.toLocaleString()}
                  </p>
                </div>

                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  ฿{sub.monthlyEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })}{t("common.perMonth")}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("common.totalPerMonth")}</span>
            <span className="text-lg font-bold text-red-500">
              ฿{totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
