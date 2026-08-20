import { useMemo } from "react";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { getDirectionLabels, getMarketLabels } from "@/features/trading/constants/labels";
import { getFrequencyLabels } from "@/features/habits/constants/labels";
import { getPriorityLabels } from "@/features/todo/constants/labels";
import { useTranslation } from "@/i18n/useTranslation";

export interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  path: string;
}

const MAX_RESULTS_PER_GROUP = 5;

export function useGlobalSearch(query: string): SearchResult[] {
  const { t } = useTranslation();
  const { transactions } = useTransactionStore();
  const { trades } = useTradeStore();
  const { todos } = useTodoStore();
  const { habits } = useHabitStore();
  const { goals } = useGoalStore();
  const { holdings } = useHoldingStore();
  const { items: scheduleItems } = useScheduleItemStore();
  const { budgets } = useBudgetStore();
  const { accounts } = useAccountStore();
  const { categories } = useCategoryStore();
  const { profiles } = useRecipientProfileStore();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return [];

    const frequencyLabels = getFrequencyLabels(t);
    const directionLabels = getDirectionLabels(t);
    const marketLabels = getMarketLabels(t);
    const priorityLabels = getPriorityLabels(t);

    const transactionResults: SearchResult[] = transactions
      .filter((tx) => tx.title.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((tx) => ({
        id: `transaction-${tx.id}`,
        label: tx.title,
        sublabel: `${tx.type === "expense" ? "-" : "+"}฿${tx.amount.toLocaleString()} · ${tx.date}`,
        path: "/transactions",
      }));

    const tradeResults: SearchResult[] = trades
      .filter(
        (tr) =>
          tr.symbol.toLowerCase().includes(q) ||
          (tr.strategy ?? "").toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((tr) => ({
        id: `trade-${tr.id}`,
        label: tr.symbol,
        sublabel: `${directionLabels[tr.direction]} · ${tr.entryDate}`,
        path: "/trading/journal",
      }));

    const todoResults: SearchResult[] = todos
      .filter((td) => td.title.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((td) => ({
        id: `todo-${td.id}`,
        label: td.title,
        sublabel: priorityLabels[td.priority],
        path: "/todo",
      }));

    const habitResults: SearchResult[] = habits
      .filter((h) => h.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((h) => ({
        id: `habit-${h.id}`,
        label: h.name,
        sublabel: frequencyLabels[h.frequency],
        path: "/habits",
      }));

    const goalResults: SearchResult[] = goals
      .filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((g) => ({
        id: `goal-${g.id}`,
        label: g.name,
        sublabel: `฿${g.currentAmount.toLocaleString()} / ฿${g.targetAmount.toLocaleString()}`,
        path: "/goals",
      }));

    const holdingResults: SearchResult[] = holdings
      .filter((h) => h.symbol.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((h) => ({
        id: `holding-${h.id}`,
        label: h.symbol,
        sublabel: `${marketLabels[h.market]} · ${h.quantity}`,
        path: "/trading/portfolio",
      }));

    const scheduleResults: SearchResult[] = scheduleItems
      .filter((s) => s.title.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((s) => ({
        id: `schedule-${s.id}`,
        label: s.title,
        sublabel: s.startTime,
        path: "/schedule",
      }));

    const budgetResults: SearchResult[] = budgets
      .filter((b) => b.category.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((b) => ({
        id: `budget-${b.id}`,
        label: b.category,
        sublabel: `฿${b.amount.toLocaleString()} · ${t(`common.${b.period}`)}`,
        path: "/budget",
      }));

    const accountResults: SearchResult[] = accounts
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((a) => ({
        id: `account-${a.id}`,
        label: a.name,
        sublabel: t(`accounts.types.${a.type}`),
        path: "/accounts",
      }));

    const categoryResults: SearchResult[] = categories
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((c) => ({
        id: `category-${c.id}`,
        label: c.name,
        sublabel: c.type === "income" ? t("transactions.income") : t("transactions.expense"),
        path: "/categories",
      }));

    const recipientResults: SearchResult[] = profiles
      .filter((p) => p.alias.toLowerCase().includes(q) || p.recipientKey.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP)
      .map((p) => ({
        id: `recipient-${p.id}`,
        label: p.alias,
        sublabel: p.category,
        path: "/recipients",
      }));

    return [
      ...transactionResults,
      ...tradeResults,
      ...todoResults,
      ...habitResults,
      ...goalResults,
      ...holdingResults,
      ...scheduleResults,
      ...budgetResults,
      ...accountResults,
      ...categoryResults,
      ...recipientResults,
    ];
  }, [
    query,
    t,
    transactions,
    trades,
    todos,
    habits,
    goals,
    holdings,
    scheduleItems,
    budgets,
    accounts,
    categories,
    profiles,
  ]);
}
