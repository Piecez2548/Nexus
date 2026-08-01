import { CalendarDays, Coffee, Moon, ShoppingBag, Utensils, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { BehaviorFlag, BehaviorFlagKey } from "@/features/finance/aiAnalytics/engine/analyzers/behaviorAnalysis";

interface Props {
  flag: BehaviorFlag;
}

const FLAG_ICONS: Record<BehaviorFlagKey, LucideIcon> = {
  eatingOut: Utensils,
  coffee: Coffee,
  convenienceStore: ShoppingBag,
  weekendSpending: CalendarDays,
  nightSpending: Moon,
};

export default function BehaviorFlagCard({ flag }: Props) {
  const { t } = useTranslation();
  const Icon = FLAG_ICONS[flag.key];

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon size={16} className="text-zinc-500 dark:text-zinc-400" />
        {t(`aiAnalytics.behaviorAnalysis.flags.${flag.key}`)}
      </div>

      <p className="text-xl font-bold">฿{flag.totalAmount.toLocaleString()}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.behaviorAnalysis.transactionsCount", { count: flag.transactionCount })}</p>

      {flag.dataQuality !== "full" && (
        <p className="mt-2 text-xs text-amber-500">
          {t(flag.dataQuality === "unavailable" ? "aiAnalytics.behaviorAnalysis.unavailableDataNotice" : "aiAnalytics.behaviorAnalysis.thinDataNotice")}
        </p>
      )}
    </div>
  );
}
