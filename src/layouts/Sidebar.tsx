import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  LineChart,
  ListChecks,
  Settings,
  ChevronDown,
  Zap,
} from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";

import ThemeToggleSwitch from "@/components/ui/ThemeToggleSwitch";
import { useTranslation } from "@/i18n/useTranslation";
import { financeMenus, tradingMenus, personalMenus, type MenuItem } from "./navItems";

function NavItem({ icon: Icon, labelKey, path }: MenuItem) {
  const { t } = useTranslation();

  return (
    <NavLink
      to={path}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
          isActive
            ? "bg-brand-600 text-white shadow-lg"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
        }`
      }
    >
      <Icon size={20} />
      <span>{t(labelKey)}</span>
    </NavLink>
  );
}

interface GroupProps {
  icon: typeof LayoutDashboard;
  labelKey: string;
  items: MenuItem[];
  isActive: boolean;
}

function NavGroup({ icon: Icon, labelKey, items, isActive }: GroupProps) {
  const [open, setOpen] = useState(isActive);
  const { t } = useTranslation();

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all ${
          isActive && !open
            ? "bg-brand-600/10 text-brand-600 dark:text-brand-400"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon size={20} />
          {t(labelKey)}
        </span>

        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-1 space-y-1 pl-4">
          {items.map((item) => (
            <NavItem key={item.labelKey} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();

  const isFinanceActive = financeMenus.some((item) => location.pathname.startsWith(item.path));
  const isTradingActive = tradingMenus.some((item) => location.pathname.startsWith(item.path));
  const isPersonalActive = personalMenus.some((item) => location.pathname.startsWith(item.path));

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 md:flex">

      {/* Logo */}

      <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-glow"
            style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
          >
            <Zap size={18} className="text-white" fill="currentColor" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-wide">NEXUS</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-500">{t("nav.tagline")}</p>
          </div>
        </div>

      </div>

      {/* Menu */}

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">

        <NavItem icon={LayoutDashboard} labelKey="nav.dashboard" path="/dashboard" />

        <NavGroup icon={Wallet} labelKey="nav.finance" items={financeMenus} isActive={isFinanceActive} />

        <NavGroup icon={LineChart} labelKey="nav.trading" items={tradingMenus} isActive={isTradingActive} />

        <NavGroup icon={ListChecks} labelKey="nav.personal" items={personalMenus} isActive={isPersonalActive} />

        <NavItem icon={Settings} labelKey="nav.settings" path="/settings" />

      </nav>

      {/* Footer */}

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-3">

        <ThemeToggleSwitch />

        <div className="rounded-xl bg-white dark:bg-zinc-900 p-4">

          <p className="text-sm font-medium">
            Nexus
          </p>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">
            {t("nav.version")}
          </p>

        </div>

      </div>

    </aside>
  );
}
