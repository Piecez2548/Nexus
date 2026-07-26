import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, Plus, PiggyBank, Menu } from "lucide-react";

import { useUIStore } from "@/features/finance/store/uiStore";
import { useTranslation } from "@/i18n/useTranslation";

interface TabLinkProps {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  end?: boolean;
}

function TabLink({ to, icon: Icon, labelKey, end }: TabLinkProps) {
  const { t } = useTranslation();

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition ${
          isActive ? "text-brand-500" : "text-zinc-500 dark:text-zinc-400"
        }`
      }
    >
      <Icon size={22} />
      <span>{t(labelKey)}</span>
    </NavLink>
  );
}

interface Props {
  onMoreClick: () => void;
}

export default function MobileTabBar({ onMoreClick }: Props) {
  const { openTransactionDrawer } = useUIStore();
  const { t } = useTranslation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <TabLink to="/dashboard" icon={LayoutDashboard} labelKey="nav.dashboard" end />
      <TabLink to="/transactions" icon={Wallet} labelKey="nav.transactions" />

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={() => openTransactionDrawer()}
          aria-label={t("transactions.addTransaction")}
          className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700"
        >
          <Plus size={26} />
        </button>
      </div>

      <TabLink to="/budget" icon={PiggyBank} labelKey="nav.budget" />

      <button
        type="button"
        onClick={onMoreClick}
        aria-label={t("nav.more")}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <Menu size={22} />
        <span>{t("nav.more")}</span>
      </button>
    </nav>
  );
}
