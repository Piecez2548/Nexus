import { lazy, Suspense, useEffect, useState } from "react";
import { Images, Moon, Sun } from "lucide-react";

import { useAppSettingsStore } from "@/store/appSettingsStore";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useTranslation } from "@/i18n/useTranslation";

import GlobalSearch from "./GlobalSearch";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import LevelBadge from "./LevelBadge";

const GalleryScanFlow = lazy(() => import("@/features/finance/slipScanner/components/GalleryScanFlow"));

export default function TopBar() {
  const themeMode = useAppSettingsStore((s) => s.themeMode);
  const setThemeMode = useAppSettingsStore((s) => s.setThemeMode);
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
      data-shell-audit="header"
      className="main-topbar flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 md:px-8"
      style={{ paddingTop: "calc(.5rem + env(safe-area-inset-top))", minHeight: "calc(4rem + env(safe-area-inset-top))" }}
    >

      <div className="hidden min-w-0 basis-48 grow md:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 md:gap-4">

        <LevelBadge />

        <GlobalGalleryScan />

        <button
          type="button"
          onClick={() => setThemeMode(isDark ? "light" : "dark")}
          aria-label={t("topbar.toggleDarkMode")}
          className="min-h-11 min-w-11 rounded-xl p-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
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

function GlobalGalleryScan() {
  const { t } = useTranslation();
  const [scannerLoaded, setScannerLoaded] = useState(false);

  if (!scannerLoaded) {
    return (
      <button
        type="button"
        onClick={() => setScannerLoaded(true)}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <Images size={18} aria-hidden="true" />
        {t("transactions.scanGallery")}
      </button>
    );
  }

  return (
    <Suspense
      fallback={
        <button type="button" disabled className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm opacity-60 dark:border-zinc-700">
          <Images size={18} aria-hidden="true" />
          {t("transactions.scanGallery")}
        </button>
      }
    >
      <GalleryScanFlow automaticScan={false} initialOpen />
    </Suspense>
  );
}
