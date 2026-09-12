import { memo, useId, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useNotificationStore } from "@/store/notificationStore";
import DropdownPanel from "@/components/ui/DropdownPanel";
import { useTranslation } from "@/i18n/useTranslation";

function NotificationsMenu() {
  const panelId = useId();
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
        aria-controls={open ? panelId : undefined}
        className="relative min-h-11 min-w-11 rounded-xl p-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      <DropdownPanel open={open} className="main-popover main-notifications rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-lg">
        <div id={panelId} role="region" aria-label={t("topbar.notifications")}>
        <p className="px-2 py-1 text-sm font-semibold">{t("topbar.notifications")}</p>

        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("topbar.notificationsEmpty")}
          </p>
        ) : (
          <div className="mt-1 max-h-80 space-y-2 overflow-y-auto">
            {notifications.map((notification) => {
              const text = t(notification.key, notification.params);
              return (
                <div
                  key={notification.id}
                  className="main-warning flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 break-words">{text}</span>

                  <button
                    type="button"
                    onClick={() => dismiss(notification.id)}
                    aria-label={t("topbar.dismissNotification", { message: text })}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 transition hover:underline"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </DropdownPanel>
    </div>
  );
}

export default memo(NotificationsMenu);
