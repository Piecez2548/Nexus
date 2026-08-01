import { useTranslation } from "@/i18n/useTranslation";
import type { LargePurchaseEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  purchases: LargePurchaseEntry[];
}

// Shared by SpendingAnalysisSection and BehaviorAnalysisSection — both
// render the exact same behaviorAnalysis.largePurchases data, so one
// component guarantees they never disagree with each other.
export default function LargestTransactionsList({ purchases }: Props) {
  const { t } = useTranslation();

  if (purchases.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorAnalysis.noLargePurchases")}</p>;
  }

  return (
    <ul className="space-y-2">
      {purchases.map((p) => (
        <li key={p.id ?? `${p.date}-${p.amount}`} className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{p.category ?? ""} · {p.date}</div>
          </div>
          <span className="font-medium">฿{p.amount.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
