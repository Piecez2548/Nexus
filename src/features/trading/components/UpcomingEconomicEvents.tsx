import { useEffect, useMemo } from "react";
import { CalendarClock } from "lucide-react";

import { useEconomicEventStore } from "@/features/trading/store/economicEventStore";
import { getImpactLabels } from "@/features/trading/constants/labels";
import { parseLocalDate } from "@/utils/localDate";
import { useTranslation } from "@/i18n/useTranslation";

const UPCOMING_LIMIT = 5;

const IMPACT_BADGE_CLASS: Record<string, string> = {
  low: "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300",
  medium: "bg-amber-500/15 text-amber-500",
  high: "bg-red-500/15 text-red-400",
};

function eventDateTime(eventDate: string, eventTime?: string): Date {
  const [hour, minute] = (eventTime ?? "00:00").split(":").map(Number);
  const date = parseLocalDate(eventDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// Compact Dashboard preview -- the only new entity in this batch that also
// gets a Dashboard widget, since time-sensitive info benefits from
// surfacing; Strategy Library/Watchlist are reference/management pages
// reached via nav only, matching Merchant's own precedent.
export default function UpcomingEconomicEvents() {
  const { economicEvents, loadEconomicEvents } = useEconomicEventStore();
  const { t } = useTranslation();
  const impactLabels = getImpactLabels(t);

  useEffect(() => {
    loadEconomicEvents();
  }, [loadEconomicEvents]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return economicEvents
      .filter((e) => eventDateTime(e.eventDate, e.eventTime) >= now)
      .sort((a, b) => eventDateTime(a.eventDate, a.eventTime).getTime() - eventDateTime(b.eventDate, b.eventTime).getTime())
      .slice(0, UPCOMING_LIMIT);
  }, [economicEvents]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <CalendarClock size={18} />
        {t("economicCalendar.upcomingTitle")}
      </h2>

      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("economicCalendar.noUpcomingEvents")}</p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {event.eventDate}
                  {event.eventTime ? ` ${event.eventTime}` : ""}
                </p>
              </div>

              {event.impact && (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${IMPACT_BADGE_CLASS[event.impact]}`}>
                  {impactLabels[event.impact]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
