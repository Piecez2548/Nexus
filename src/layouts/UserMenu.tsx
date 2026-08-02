import { memo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle2, ChevronDown, Settings, Lock } from "lucide-react";

import { useAppLockStore } from "@/store/appLockStore";
import { useClickOutside } from "@/hooks/useClickOutside";
import DropdownPanel from "@/components/ui/DropdownPanel";
import { useTranslation } from "@/i18n/useTranslation";

function UserMenu() {
  const navigate = useNavigate();
  const isEnabled = useAppLockStore((s) => s.isEnabled());
  const lock = useAppLockStore((s) => s.lock);
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={t("topbar.userMenu")}
        className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <UserCircle2 size={34} />

        <div className="hidden text-left md:block">
          <p className="text-sm font-semibold">Min</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-500">{t("nav.personal")}</p>
        </div>

        <ChevronDown size={16} className="hidden md:block" />
      </button>

      <DropdownPanel open={open} className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-lg">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate("/settings");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Settings size={16} />
          {t("nav.settings")}
        </button>

        {isEnabled && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              lock();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Lock size={16} />
            {t("topbar.lockApp")}
          </button>
        )}
      </DropdownPanel>
    </div>
  );
}

export default memo(UserMenu);
