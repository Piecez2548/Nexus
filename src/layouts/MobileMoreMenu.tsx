import { NavLink } from "react-router-dom";
import { Settings } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { useTranslation } from "@/i18n/useTranslation";
import { financeMenus, tradingMenus, personalMenus, type MenuItem } from "./navItems";

const SECTIONS: { titleKey: string; items: MenuItem[] }[] = [
  { titleKey: "nav.finance", items: financeMenus },
  { titleKey: "nav.trading", items: tradingMenus },
  { titleKey: "nav.personal", items: personalMenus },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

const linkClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 transition ${
    isActive
      ? "bg-violet-600 text-white"
      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
  }`;

export default function MobileMoreMenu({ open, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">{t("nav.menu")}</h2>

        {SECTIONS.map((section) => (
          <div key={section.titleKey}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t(section.titleKey)}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={onClose} className={linkClassName}>
                  <item.icon size={20} />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <NavLink to="/settings" onClick={onClose} className={linkClassName}>
          <Settings size={20} />
          {t("nav.settings")}
        </NavLink>
      </div>
    </Drawer>
  );
}
