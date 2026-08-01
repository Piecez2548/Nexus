import { useTranslation } from "@/i18n/useTranslation";
import type { ImpulsePurchaseEntry } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  purchases: ImpulsePurchaseEntry[];
}

export default function ImpulsePurchasesList({ purchases }: Props) {
  const { t } = useTranslation();

  if (purchases.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorAnalysis.noImpulsePurchases")}</p>;
  }

  return (
    <ul className="space-y-2">
      {purchases.map((p) => (
        <li key={p.id ?? `${p.date}-${p.amount}-${p.title}`} className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {p.date} · {t(`aiAnalytics.behaviorAnalysis.impulseReason.${p.reason}`)}
            </div>
          </div>
          <span className="font-medium">฿{p.amount.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
