import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useEconomicEventStore } from "@/features/trading/store/economicEventStore";
import EconomicEventList from "@/features/trading/components/EconomicEventList";
import EconomicEventForm from "@/features/trading/components/EconomicEventForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { EconomicEvent } from "@/features/trading/types";

export default function EconomicCalendar() {
  const { economicEvents, loading, error, loadEconomicEvents } = useEconomicEventStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadEconomicEvents();
  }, [loadEconomicEvents]);

  function handleAdd() {
    setSelectedEvent(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(event: EconomicEvent) {
    setSelectedEvent(event);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedEvent(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("economicCalendar.pageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">{t("economicCalendar.pageDescription")}</p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("economicCalendar.addEvent")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadEconomicEvents} />
      ) : loading && economicEvents.length === 0 ? (
        <LoadingState label={t("economicCalendar.loading")} />
      ) : economicEvents.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("economicCalendar.emptyState")}
        </div>
      ) : (
        <EconomicEventList events={economicEvents} onEdit={handleEdit} />
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <EconomicEventForm event={selectedEvent} onDone={handleClose} />
      </Drawer>
    </div>
  );
}
