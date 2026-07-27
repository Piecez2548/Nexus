import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

import { useCalendarEventStore } from "@/features/calendar/store/calendarEventStore";
import { getOccurrencesInRange } from "@/features/calendar/utils/recurrence";
import { useTranslation } from "@/i18n/useTranslation";

const UPCOMING_DAYS = 14;

export default function CalendarOverviewPanel() {
  const { events, loadEvents } = useCalendarEventStore();
  const { t, language } = useTranslation();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Always "what's actually upcoming," unaffected by the Dashboard's
  // day/month/year period selector — same reasoning as Recent Transactions:
  // this panel's whole purpose is recency/relevance, not a period total.
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + UPCOMING_DAYS);

  // One entry per event, not per occurrence — otherwise a single daily
  // recurring event could fill all 4 slots by itself.
  const upcoming = events
    .map((event) => {
      const [soonest] = getOccurrencesInRange(event, rangeStart, rangeEnd);
      return soonest ? { event, occurrence: soonest } : null;
    })
    .filter((item): item is { event: (typeof events)[number]; occurrence: Date } => item !== null)
    .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("nav.calendar")}</h2>

        <Link to="/calendar" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
          <CalendarDays size={16} />
          {t("common.viewAll")}
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-10 text-center text-zinc-600 dark:text-zinc-500">{t("dashboard.noUpcomingEvents")}</div>
      ) : (
        <div className="space-y-3">
          {upcoming.map(({ event, occurrence }) => (
            <div key={`${event.id}-${occurrence.getTime()}`} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{event.title}</span>

              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {occurrence.toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {!event.allDay &&
                  " " +
                    occurrence.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
