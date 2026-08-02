import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { useAppSettingsStore } from "@/store/appSettingsStore";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { useHabitStore } from "@/features/habits/store/habitStore";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { useTranslation } from "@/i18n/useTranslation";

import GlobalSearch from "./GlobalSearch";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import LevelBadge from "./LevelBadge";

export default function TopBar() {
  const { themeMode, setThemeMode } = useAppSettingsStore();
  const isDark = useResolvedTheme(themeMode);
  const { t } = useTranslation();

  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const loadBudgets = useBudgetStore((s) => s.loadBudgets);
  const loadTrades = useTradeStore((s) => s.loadTrades);
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  const loadGoals = useGoalStore((s) => s.loadGoals);
  const loadHoldings = useHoldingStore((s) => s.loadHoldings);
  const loadScheduleItems = useScheduleItemStore((s) => s.loadItems);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadProfiles = useRecipientProfileStore((s) => s.loadProfiles);

  // The header's search and notifications read from these stores
  // regardless of which page is currently mounted, so make sure they're
  // populated even if the user lands directly on a route that doesn't
  // load them itself.
  useEffect(() => {
    loadTransactions();
    loadBudgets();
    loadTrades();
    loadTodos();
    loadHabits();
    loadGoals();
    loadHoldings();
    loadScheduleItems();
    loadAccounts();
    loadCategories();
    loadProfiles();
  }, [
    loadTransactions,
    loadBudgets,
    loadTrades,
    loadTodos,
    loadHabits,
    loadGoals,
    loadHoldings,
    loadScheduleItems,
    loadAccounts,
    loadCategories,
    loadProfiles,
  ]);

  return (
    <header
      className="flex h-16 items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 md:px-8"
      style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(4rem + env(safe-area-inset-top))" }}
    >

      <div className="hidden min-w-0 flex-1 md:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">

        <LevelBadge />

        <button
          type="button"
          onClick={() => setThemeMode(isDark ? "light" : "dark")}
          aria-label={t("topbar.toggleDarkMode")}
          className="rounded-xl p-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationsMenu />

        <div className="hidden h-8 w-px bg-zinc-100 dark:bg-zinc-800 md:block"></div>

        <UserMenu />

      </div>

    </header>
  );
}
