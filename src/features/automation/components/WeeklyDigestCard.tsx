import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, X } from "lucide-react";

import { getLatestUnseenDigest, markDigestSeen } from "@/features/automation/automationService";
import { useAuthStore } from "@/features/sync/store/authStore";
import { useTranslation } from "@/i18n/useTranslation";
import type { WeeklyDigest } from "@/features/automation/types";

// Renders nothing until a real, unseen server-generated digest is found --
// no loading skeleton, matching InsightsPanel.tsx's own "return null until
// there's something worth showing" precedent on this same page. Dismiss
// clears local state optimistically; the row's own seen_at column (set via
// markDigestSeen) is the single source of truth for "already shown," so
// this deliberately does NOT use notificationStore.ts's dismissed-id-list
// pattern -- that exists for data with no server-side "seen" concept,
// which isn't the case here.
export default function WeeklyDigestCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);

  useEffect(() => {
    if (!user) {
      setDigest(null);
      return;
    }

    let cancelled = false;
    void getLatestUnseenDigest(user.id).then((result) => {
      if (!cancelled) setDigest(result);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!digest) return null;

  function handleDismiss() {
    if (!digest) return;
    void markDigestSeen(digest.id);
    setDigest(null);
  }

  const periodLabel = `${format(parseISO(digest.period_start), "d MMM")} – ${format(parseISO(digest.period_end), "d MMM")}`;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-brand-500" />
          <div>
            <h2 className="text-xl font-semibold">{t("automation.weeklyDigest.title")}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("automation.weeklyDigest.subtitle", { period: periodLabel })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("automation.weeklyDigest.dismiss")}
          className="shrink-0 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("automation.weeklyDigest.income")}</p>
          <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">฿{digest.income.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("automation.weeklyDigest.expense")}</p>
          <p className="mt-1 font-semibold text-red-600 dark:text-red-400">฿{digest.expense.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("automation.weeklyDigest.net")}</p>
          <p className="mt-1 font-semibold">฿{digest.net.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("automation.weeklyDigest.transactionCount")}</p>
          <p className="mt-1 font-semibold">{digest.transaction_count}</p>
        </div>
      </div>
    </div>
  );
}
