import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useCalendarEventStore } from "@/features/calendar/store/calendarEventStore";
import { getOccurrencesInRange } from "@/features/calendar/utils/recurrence";
import CalendarMonthGrid from "@/features/calendar/components/CalendarMonthGrid";
import CalendarAgendaList from "@/features/calendar/components/CalendarAgendaList";
import CalendarEventCard from "@/features/calendar/components/CalendarEventCard";
import CalendarEventForm from "@/features/calendar/components/CalendarEventForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { CalendarEvent } from "@/features/calendar/types";

type DrawerMode = "day" | "form" | null;

function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T09:00`;
}

export default function Calendar() {
  const { events, loading, error, loadEvents } = useCalendarEventStore();

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function handleAdd() {
    setSelectedEvent(null);
    setSelectedDay(null);
    setDrawerMode("form");
  }

  function handleDayClick(day: Date) {
    setSelectedDay(day);
    setDrawerMode("day");
  }

  function handleAddForDay() {
    setSelectedEvent(null);
    setDrawerMode("form");
  }

  function handleEdit(event: CalendarEvent) {
    setSelectedEvent(event);
    setDrawerMode("form");
  }

  function handleClose() {
    setDrawerMode(null);
    setSelectedEvent(null);
    setSelectedDay(null);
  }

  const dayEvents = selectedDay
    ? events
        .flatMap((event) => {
          const dayStart = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate());
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          return getOccurrencesInRange(event, dayStart, dayEnd).map((occurrence) => ({ event, occurrence }));
        })
        .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("calendar.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("calendar.addEvent")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadEvents} />
      ) : loading && events.length === 0 ? (
        <LoadingState label={t("calendar.loading")} />
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("calendar.emptyState")}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <CalendarMonthGrid events={events} onDayClick={handleDayClick} />
          </div>

          <CalendarAgendaList events={events} onEdit={handleEdit} />
        </div>
      )}

      <Drawer open={drawerMode !== null} onClose={handleClose}>
        {drawerMode === "day" && selectedDay && (
          <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h2>

              <button
                onClick={handleAddForDay}
                aria-label={t("calendar.addEvent")}
                className="rounded-xl bg-brand-600 p-2 text-white transition hover:bg-brand-700"
              >
                <Plus size={18} />
              </button>
            </div>

            {dayEvents.length === 0 ? (
              <p className="py-6 text-center text-zinc-600 dark:text-zinc-500">{t("calendar.noEventsToday")}</p>
            ) : (
              <div className="space-y-2">
                {dayEvents.map(({ event, occurrence }) => (
                  <CalendarEventCard
                    key={`${event.id}-${occurrence.getTime()}`}
                    event={event}
                    occurrence={occurrence}
                    onEdit={() => handleEdit(event)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {drawerMode === "form" && (
          <CalendarEventForm
            event={selectedEvent}
            defaultStartAt={selectedDay ? toLocalDateTimeInputValue(selectedDay) : undefined}
            onDone={handleClose}
          />
        )}
      </Drawer>
    </div>
  );
}
