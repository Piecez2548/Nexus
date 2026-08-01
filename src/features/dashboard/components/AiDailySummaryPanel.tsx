import { useEffect, useMemo } from "react";
import { Sparkles, ArrowDownRight, ArrowUpRight, ListChecks, Flame, Clock, LineChart } from "lucide-react";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useNowTick } from "@/features/schedule/hooks/useNowTick";
import {
  computeDailySummary,
  type DailySummaryIcon,
  type DailySummaryTone,
  type DailySummaryResult,
} from "@/features/dashboard/utils/dailySummary";
import { useTranslation } from "@/i18n/useTranslation";

const GREETING_KEYS: Record<DailySummaryResult["greetingKey"], string> = {
  goodMorning: "dashboard.dailySummary.greetingMorning",
  goodAfternoon: "dashboard.dailySummary.greetingAfternoon",
  goodEvening: "dashboard.dailySummary.greetingEvening",
};

const ICONS: Record<DailySummaryIcon, typeof Sparkles> = {
  expense: ArrowDownRight,
  income: ArrowUpRight,
  todo: ListChecks,
  habit: Flame,
  schedule: Clock,
  trade: LineChart,
};

const HIGHLIGHT_TEXT_CLASS: Record<DailySummaryTone, string> = {
  positive: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  neutral: "text-zinc-700 dark:text-zinc-300",
};

// Mirrors AiInsightsPanel.tsx's tone-box classes (src/features/finance/aiAnalytics/components/AiInsightsPanel.tsx)
// so the two "AI"-flavored panels in this app feel like one system.
const FOCUS_BOX_CLASS: Record<DailySummaryTone, string> = {
  warning: "border-amber-900/40 bg-amber-950/20 text-amber-300",
  positive: "border-green-900/40 bg-green-950/20 text-green-300",
  neutral: "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300",
};

export default function AiDailySummaryPanel() {
  const { transactions } = useTransactionStore();
  const { todos, loadTodos } = useTodoStore();
  const { habits, loadHabits } = useHabitStore();
  const { items: scheduleItems, loadItems } = useScheduleItemStore();
  const { trades } = useTradeStore();
  const now = useNowTick();
  const { t } = useTranslation();

  useEffect(() => {
    loadTodos();
    loadHabits();
    loadItems();
  }, [loadTodos, loadHabits, loadItems]);

  const summary = useMemo(
    () => computeDailySummary({ transactions, todos, habits, scheduleItems, trades, now }),
    [transactions, todos, habits, scheduleItems, trades, now]
  );

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={20} className="text-amber-400" />
        <h2 className="text-lg font-semibold">{t("dashboard.aiDailySummary")}</h2>
      </div>

      {!summary.hasActivityToday ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">
          {t("dashboard.dailySummary.empty")}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t(GREETING_KEYS[summary.greetingKey])}
          </p>

          <div className="space-y-2">
            {summary.highlights.map((highlight) => {
              const Icon = ICONS[highlight.icon];
              return (
                <div key={highlight.id} className="flex items-center gap-2">
                  <Icon size={16} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className={`min-w-0 flex-1 truncate text-sm ${HIGHLIGHT_TEXT_CLASS[highlight.tone]}`}>
                    {t(highlight.key, highlight.params)}
                  </span>
                </div>
              );
            })}
          </div>

          {summary.focus && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${FOCUS_BOX_CLASS[summary.focus.tone]}`}>
              {t(summary.focus.key, summary.focus.params)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
