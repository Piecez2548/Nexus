import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getOccurrencesInRange } from "@/features/calendar/utils/recurrence";
import { useTranslation } from "@/i18n/useTranslation";
import type { CalendarEvent } from "@/features/calendar/types";

interface Props {
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
}

export default function CalendarMonthGrid({ events, onDayClick }: Props) {
  const { t, language } = useTranslation();
  const [cursor, setCursor] = useState(() => new Date());

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", { weekday: "short" });
    // Jan 4 1970 was a Sunday — a known Sunday-start reference week.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(1970, 0, 4 + i)));
  }, [language]);

  const { monthLabel, cells } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 1);

    const countByDay = new Map<number, number>();
    for (const event of events) {
      for (const occurrence of getOccurrencesInRange(event, rangeStart, rangeEnd)) {
        const day = occurrence.getDate();
        countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = rangeStart.getDay();

    const cells: { day: number | null; count: number }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ day: null, count: 0 });
    for (let day = 1; day <= daysInMonth; day++) cells.push({ day, count: countByDay.get(day) ?? 0 });

    const monthLabel = rangeStart.toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
      month: "long",
      year: "numeric",
    });

    return { monthLabel, cells };
  }, [cursor, events, language]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.getFullYear() && today.getMonth() === cursor.getMonth();

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          aria-label={t("common.prev")}
          className="rounded-lg p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronLeft size={18} />
        </button>

        <h2 className="text-lg font-semibold">{monthLabel}</h2>

        <button
          type="button"
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          aria-label={t("common.next")}
          className="rounded-lg p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {weekdayLabels.map((label, index) => (
          <div key={`${label}-${index}`}>{label}</div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          const isToday = isCurrentMonth && cell.day === today.getDate();

          return (
            <button
              key={index}
              type="button"
              disabled={cell.day === null}
              onClick={() => cell.day !== null && onDayClick(new Date(cursor.getFullYear(), cursor.getMonth(), cell.day!))}
              aria-label={cell.day !== null ? t("calendar.dayHasEventsCount", { count: cell.count }) : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition ${
                cell.day === null
                  ? "cursor-default"
                  : isToday
                    ? "border-2 border-brand-500 font-semibold"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {cell.day !== null && (
                <>
                  <span>{cell.day}</span>
                  {cell.count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
