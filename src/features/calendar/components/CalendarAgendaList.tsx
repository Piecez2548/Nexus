import { getOccurrencesInRange } from "@/features/calendar/utils/recurrence";
import CalendarEventCard from "@/features/calendar/components/CalendarEventCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { CalendarEvent } from "@/features/calendar/types";

const AGENDA_DAYS = 14;

interface Props {
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
}

export default function CalendarAgendaList({ events, onEdit }: Props) {
  const { t } = useTranslation();

  const now = new Date();
  // Start-of-today, not the literal current instant — an event happening
  // earlier today (or one whose timestamp is a few seconds in the past by
  // the time this re-renders) shouldn't drop out of "upcoming".
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + AGENDA_DAYS);

  // One row per event, not per occurrence — a daily/weekly recurring event
  // would otherwise explode into up to 14 near-identical rows. The card
  // shows the frequency (e.g. "Daily") so recurrence is still clear from a
  // single row, using whichever occurrence falls soonest in this window.
  const items = events
    .map((event) => {
      const [soonest] = getOccurrencesInRange(event, rangeStart, rangeEnd);
      return soonest ? { event, occurrence: soonest } : null;
    })
    .filter((item): item is { event: CalendarEvent; occurrence: Date } => item !== null)
    .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">{t("calendar.upcomingEvents")}</h2>

      {items.length === 0 ? (
        <div className="py-6 text-center text-zinc-600 dark:text-zinc-500">{t("calendar.noUpcomingEvents")}</div>
      ) : (
        <div className="space-y-2">
          {items.map(({ event, occurrence }) => (
            <CalendarEventCard
              key={`${event.id}-${occurrence.getTime()}`}
              event={event}
              occurrence={occurrence}
              onEdit={() => onEdit(event)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
