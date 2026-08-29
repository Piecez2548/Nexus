import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { useAppSettingsStore } from "@/store/appSettingsStore";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
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

  // Notifications are always visible and depend on these two collections.
  // The other searchable collections are loaded lazily by GlobalSearch when
  // the user first focuses it, avoiding nine eager reads on every route.
  useEffect(() => {
    loadTransactions();
    loadBudgets();
  }, [loadTransactions, loadBudgets]);

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
