import { useRef, useState } from "react";
import { Bell, X } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useNotificationStore } from "@/store/notificationStore";
import DropdownPanel from "@/components/ui/DropdownPanel";
import { useTranslation } from "@/i18n/useTranslation";

export default function NotificationsMenu() {
  const notifications = useNotifications();
  const dismiss = useNotificationStore((state) => state.dismiss);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("topbar.notifications")}
        aria-expanded={open}
        className="relative rounded-xl p-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      <DropdownPanel open={open} className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-lg">
        <p className="px-2 py-1 text-sm font-semibold">{t("topbar.notifications")}</p>

        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("topbar.notificationsEmpty")}
          </p>
        ) : (
          <div className="mt-1 max-h-80 space-y-2 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-2 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-300"
              >
                <span className="flex-1">{notification.message}</span>

                <button
                  type="button"
                  onClick={() => dismiss(notification.id)}
                  aria-label={t("topbar.dismissNotification", { message: notification.message })}
                  className="shrink-0 rounded-lg p-1 text-amber-300/70 transition hover:bg-amber-900/30 hover:text-amber-200"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </DropdownPanel>
    </div>
  );
}
