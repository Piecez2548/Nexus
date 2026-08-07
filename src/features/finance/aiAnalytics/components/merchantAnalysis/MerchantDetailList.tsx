import { Line, LineChart, ResponsiveContainer } from "recharts";
import MobileRowCard from "@/components/ui/MobileRowCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { TopMerchantEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  merchants: TopMerchantEntry[];
}

function TrendSparkline({ merchant }: { merchant: TopMerchantEntry }) {
  const hasData = merchant.monthlyTrend.some((m) => m.amount > 0);
  if (!hasData) return null;

  // Decorative sparkline: the merchant's transaction count, average, and
  // total are already read out from the adjacent text cells, so this graphic
  // is redundant to a screen reader — hide it rather than announce an
  // unlabeled SVG. (It also sizes with height="100%", so it can't be wrapped
  // in a plain role="img" block without collapsing.)
  return (
    <div className="h-8 w-20" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merchant.monthlyTrend}>
          <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Dual desktop-table/mobile-MobileRowCard layout, mirroring TopMerchantsList
// (whose data this section replaced — see BehaviorAnalysisSection.tsx).
export default function MerchantDetailList({ merchants }: Props) {
  const { t } = useTranslation();

  if (merchants.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorAnalysis.noMerchants")}</p>;
  }

  return (
    <div>
      <div className="space-y-3 md:hidden">
        {merchants.map((m) => (
          <MobileRowCard
            key={m.alias}
            title={m.alias}
            subtitle={m.category}
            trailing={<span className="font-medium">฿{m.totalAmount.toLocaleString()}</span>}
            meta={
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("aiAnalytics.behaviorAnalysis.transactionsCount", { count: m.transactionCount })} ·{" "}
                {t("aiAnalytics.merchantAnalysis.averagePurchaseValue", { amount: Math.round(m.averagePurchase).toLocaleString() })}
              </span>
            }
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="py-2">{t("aiAnalytics.behaviorAnalysis.merchant")}</th>
            <th className="py-2 text-right">{t("aiAnalytics.behaviorAnalysis.transactions")}</th>
            <th className="py-2 text-right">{t("aiAnalytics.merchantAnalysis.averagePurchase")}</th>
            <th className="py-2 text-right">{t("aiAnalytics.behaviorAnalysis.total")}</th>
            <th className="py-2 text-right">{t("aiAnalytics.merchantAnalysis.monthlyTrend")}</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((m) => (
            <tr key={m.alias} className="border-b border-zinc-200 dark:border-zinc-800 last:border-0">
              <td className="py-2">
                <div className="font-medium">{m.alias}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{m.category}</div>
              </td>
              <td className="py-2 text-right">{m.transactionCount}</td>
              <td className="py-2 text-right">฿{Math.round(m.averagePurchase).toLocaleString()}</td>
              <td className="py-2 text-right font-medium">฿{m.totalAmount.toLocaleString()}</td>
              <td className="py-2 text-right">
                <div className="ml-auto">
                  <TrendSparkline merchant={m} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
