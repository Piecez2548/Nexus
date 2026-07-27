import { Pencil, Trash2, MapPin, Repeat } from "lucide-react";

import { useCalendarEventStore } from "@/features/calendar/store/calendarEventStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { CalendarEvent } from "@/features/calendar/types";

interface Props {
  event: CalendarEvent;
  occurrence: Date;
  onEdit: () => void;
}

export default function CalendarEventCard({ event, occurrence, onEdit }: Props) {
  const { deleteEvent } = useCalendarEventStore();
  const { t, language } = useTranslation();
  const toast = useToast();

  async function handleDelete() {
    if (event.id === undefined) return;

    try {
      await deleteEvent(event.id);
      toast.success(t("calendar.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  const timeLabel = event.allDay
    ? t("calendar.allDayLabel")
    : occurrence.toLocaleTimeString(language === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{event.title}</h3>
            {event.recurring && <Repeat size={14} className="shrink-0 text-zinc-400" />}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{timeLabel}</p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <MapPin size={14} />
              {event.location}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label={t("calendar.editEventName", { title: event.title })}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={handleDelete}
            aria-label={t("calendar.deleteEventName", { title: event.title })}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
