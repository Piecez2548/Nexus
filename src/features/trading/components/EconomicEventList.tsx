import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useEconomicEventStore } from "@/features/trading/store/economicEventStore";
import { getImpactLabels } from "@/features/trading/constants/labels";
import { parseLocalDate } from "@/utils/localDate";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { EconomicEvent } from "@/features/trading/types";

interface Props {
  events: EconomicEvent[];
  onEdit: (event: EconomicEvent) => void;
}

const IMPACT_BADGE_CLASS: Record<string, string> = {
  low: "bg-zinc-200/60 dark:bg-zinc-700/40 text-zinc-700 dark:text-zinc-300",
  medium: "bg-amber-500/15 text-amber-500",
  high: "bg-red-500/15 text-red-400",
};

// Combines eventDate + eventTime (defaulting missing time to midnight) into
// a real Date, for chronological sorting and past/upcoming comparison.
function eventDateTime(event: EconomicEvent): Date {
  const [hour, minute] = (event.eventTime ?? "00:00").split(":").map(Number);
  const date = parseLocalDate(event.eventDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export default function EconomicEventList({ events, onEdit }: Props) {
  const { deleteEconomicEvent } = useEconomicEventStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const impactLabels = getImpactLabels(t);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => eventDateTime(a).getTime() - eventDateTime(b).getTime()),
    [events]
  );

  async function handleDelete(event: EconomicEvent) {
    if (event.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteEconomicEvent(event.id);
      toast.success(t("economicCalendar.deletedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  const now = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
      {deleteError && (
        <div className="border-b border-red-900/50 bg-red-950/30 px-6 py-3 text-sm text-red-400">{deleteError}</div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {sortedEvents.map((event) => {
          const past = eventDateTime(event) < now;

          return (
            <div
              key={event.id}
              className={`flex items-center justify-between p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/40 ${
                past ? "opacity-50" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.title}</span>
                  {event.impact && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${IMPACT_BADGE_CLASS[event.impact]}`}>
                      {impactLabels[event.impact]}
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-500">
                  {event.eventDate}
                  {event.eventTime ? ` ${event.eventTime}` : ""}
                  {event.notes ? ` · ${event.notes}` : ""}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(event)}
                  aria-label={t("common.editName", { name: event.title })}
                  className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => handleDelete(event)}
                  aria-label={t("common.deleteName", { name: event.title })}
                  className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
