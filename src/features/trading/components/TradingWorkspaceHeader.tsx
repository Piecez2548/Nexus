import { BarChart3, BookOpen, LayoutDashboard, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  title: string;
  tradeCount: number;
  totalPnl: number;
  onAddTrade: () => void;
}

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-500/15 text-brand-600 dark:text-brand-400"
      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
  }`;

export default function TradingWorkspaceHeader({ title, tradeCount, totalPnl, onAddTrade }: Props) {
  const { t } = useTranslation();

  return (
    <header data-shell-audit="workspace" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="main-workspace-heading flex flex-col gap-5 border-b border-zinc-200 p-5 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t("trading.workspaceSummary", {
              count: tradeCount,
              pnl: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddTrade}
          className="flex min-w-0 max-w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition hover:bg-brand-500 nexus-primary-action"
        >
          <Plus size={18} />
          {t("trading.addTrade")}
        </button>
      </div>

      <nav aria-label={t("trading.workspaceNavigation")} className="flex flex-wrap gap-1 p-2">
        <NavLink to="/trading" end className={tabClass}>
          <LayoutDashboard size={16} />
          {t("trading.dashboardTab")}
        </NavLink>
        <NavLink to="/trading/journal" className={tabClass}>
          <BookOpen size={16} />
          {t("trading.journalTab")}
        </NavLink>
        <NavLink to="/trading#analytics" className={() => tabClass({ isActive: false })}>
          <BarChart3 size={16} />
          {t("trading.analyticsTab")}
        </NavLink>
      </nav>
    </header>
  );
}
