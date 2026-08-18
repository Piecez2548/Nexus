import { useCallback, useEffect, useState } from "react";
import { Images, MapPin, Bell, BellRing, ExternalLink, type LucideIcon } from "lucide-react";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import Drawer from "@/components/ui/Drawer";
import { listPermissions, type PermissionEntry, type PermissionKey, type PermissionStatus } from "@/features/security/permissions/permissionManagerService";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PERMISSION_ORDER: PermissionKey[] = ["gallery", "location", "localNotifications", "notificationAccess"];

const PERMISSION_ICON: Record<PermissionKey, LucideIcon> = {
  gallery: Images,
  location: MapPin,
  localNotifications: Bell,
  notificationAccess: BellRing,
};

const PERMISSION_LABEL_KEY: Record<PermissionKey, string> = {
  gallery: "security.permissionManager.galleryLabel",
  location: "security.permissionManager.locationLabel",
  localNotifications: "security.permissionManager.localNotificationsLabel",
  notificationAccess: "security.permissionManager.notificationAccessLabel",
};

const PERMISSION_USED_BY_KEY: Record<PermissionKey, string> = {
  gallery: "security.permissionManager.galleryUsedBy",
  location: "security.permissionManager.locationUsedBy",
  localNotifications: "security.permissionManager.localNotificationsUsedBy",
  notificationAccess: "security.permissionManager.notificationAccessUsedBy",
};

const STATUS_LABEL_KEY: Record<PermissionStatus, string> = {
  granted: "security.permissionManager.statusGranted",
  limited: "security.permissionManager.statusLimited",
  prompt: "security.permissionManager.statusPrompt",
  denied: "security.permissionManager.statusDenied",
  blocked: "security.permissionManager.statusBlocked",
  unavailable: "security.permissionManager.statusUnavailable",
};

const STATUS_BADGE_CLASSES: Record<PermissionStatus, string> = {
  granted: "bg-green-500/15 text-green-600 dark:text-green-400",
  limited: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  prompt: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  denied: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  blocked: "bg-red-500/15 text-red-600 dark:text-red-400",
  unavailable: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

// SEC-001: a single dedicated view aggregating every OS-level permission
// this app requests, previously only checkable inline from within each
// feature that uses it (Gallery Scanner, Workout Tracker GPS, reminders,
// Payment Notification Capture). Read-mostly -- Android provides no API for
// an app to revoke its own permission, only request or open Settings.
export default function PermissionManagerDrawer({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<PermissionEntry[]>([]);
  const [pendingKey, setPendingKey] = useState<PermissionKey | null>(null);

  const refresh = useCallback(async () => {
    setEntries(await listPermissions());
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();

    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = App.addListener("resume", () => void refresh());
    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [open, refresh]);

  async function handleRequest(entry: PermissionEntry): Promise<void> {
    if (!entry.request) return;
    setPendingKey(entry.key);
    try {
      const status = await entry.request();
      setEntries((prev) => prev.map((e) => (e.key === entry.key ? { ...e, status, request: status === "blocked" ? undefined : e.request } : e)));
    } finally {
      setPendingKey(null);
    }
  }

  async function handleOpenSettings(entry: PermissionEntry): Promise<void> {
    if (!entry.openSettings) return;
    await entry.openSettings();
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div>
          <h2 className="text-xl font-bold">{t("security.permissionManager.title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("security.permissionManager.subtitle")}</p>
        </div>

        {!Capacitor.isNativePlatform() ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("security.permissionManager.webUnavailable")}
          </p>
        ) : (
          <ul className="space-y-2">
            {PERMISSION_ORDER.map((key) => {
              const entry = entries.find((e) => e.key === key);
              const status = entry?.status ?? "prompt";
              const Icon = PERMISSION_ICON[key];

              return (
                <li key={key} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Icon size={18} className="mt-0.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <div>
                        <p className="font-medium">{t(PERMISSION_LABEL_KEY[key])}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t(PERMISSION_USED_BY_KEY[key])}</p>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}>
                      {t(STATUS_LABEL_KEY[status])}
                    </span>
                  </div>

                  {entry?.request && (
                    <button
                      type="button"
                      disabled={pendingKey === key}
                      onClick={() => void handleRequest(entry)}
                      className="mt-3 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("security.permissionManager.request")}
                    </button>
                  )}

                  {entry?.openSettings && (
                    <button
                      type="button"
                      onClick={() => void handleOpenSettings(entry)}
                      className="mt-3 flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <ExternalLink size={14} />
                      {t("security.permissionManager.openSettings")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
