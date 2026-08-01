import { AlertTriangle, Banknote, CalendarDays, History, ShoppingCart, Target } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import type { TimelineEvent, TimelineEventType } from "@/features/finance/aiAnalytics/engine/analyzers/timeline";

interface Props {
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<TimelineEventType, typeof Banknote> = {
  salaryReceived: Banknote,
  budgetExceeded: AlertTriangle,
  largePurchase: ShoppingCart,
  monthlySummary: History,
  savingMilestone: Target,
  highestSpendingDay: CalendarDays,
};

const EVENT_ICON_COLOR: Record<TimelineEventType, string> = {
  salaryReceived: "text-green-500",
  budgetExceeded: "text-red-500",
  largePurchase: "text-amber-500",
  monthlySummary: "text-zinc-500 dark:text-zinc-400",
  savingMilestone: "text-violet-500",
  highestSpendingDay: "text-cyan-500",
};

export default function FinancialTimelineSection({ events }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History size={20} className="text-slate-500" />
        <h2 className="text-lg font-semibold">{t("aiAnalytics.timeline.title")}</h2>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.timeline.empty")}</p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.type];
              return (
                <li key={event.id} className="flex items-start gap-3">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${EVENT_ICON_COLOR[event.type]}`} />
                  <div className="min-w-0">
                    <p className="text-sm">{t(`aiAnalytics.timeline.events.${event.type}`, event.params)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{event.date.slice(0, 10)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
