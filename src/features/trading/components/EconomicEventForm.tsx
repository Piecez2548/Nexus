import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { economicEventSchema, type EconomicEventFormData } from "@/features/trading/schemas/economicEventSchema";
import { useEconomicEventStore } from "@/features/trading/store/economicEventStore";
import { getImpactLabels } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { toLocalDateString } from "@/utils/localDate";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { EconomicEvent } from "@/features/trading/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

function blankValues(): EconomicEventFormData {
  return {
    title: "",
    eventDate: toLocalDateString(new Date()),
    eventTime: "",
    impact: undefined,
    notes: "",
  };
}

interface Props {
  event: EconomicEvent | null;
  onDone: () => void;
}

export default function EconomicEventForm({ event, onDone }: Props) {
  const { addEconomicEvent, updateEconomicEvent } = useEconomicEventStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => economicEventSchema(t), [t]);
  const impactLabels = getImpactLabels(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EconomicEventFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues(),
  });

  useEffect(() => {
    reset(event ?? blankValues());
    setSubmitError(null);
  }, [event, reset]);

  async function onSubmit(data: EconomicEventFormData) {
    setSubmitError(null);
    const isEditing = event?.id !== undefined;
    const payload: EconomicEvent = {
      title: data.title,
      eventDate: data.eventDate,
      eventTime: data.eventTime || undefined,
      impact: data.impact,
      notes: data.notes || undefined,
    };

    try {
      if (event?.id !== undefined) {
        await updateEconomicEvent(event.id, payload);
      } else {
        await addEconomicEvent(payload);
      }

      onDone();
      toast.success(isEditing ? t("economicCalendar.updatedSuccess") : t("economicCalendar.savedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">
        {event ? t("economicCalendar.editEvent") : t("economicCalendar.addEvent")}
      </h2>

      <FormField label={t("economicCalendar.titleLabel")} htmlFor="economic-event-title" error={errors.title?.message}>
        <input id="economic-event-title" {...register("title")} className={inputClassName} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("common.date")} htmlFor="economic-event-date" error={errors.eventDate?.message}>
          <input id="economic-event-date" type="date" {...register("eventDate")} className={inputClassName} />
        </FormField>

        <FormField label={t("economicCalendar.timeLabel")} htmlFor="economic-event-time">
          <input id="economic-event-time" type="time" {...register("eventTime")} className={inputClassName} />
        </FormField>
      </div>

      <FormField label={t("economicCalendar.impactLabel")} htmlFor="economic-event-impact">
        <select id="economic-event-impact" {...register("impact")} className={inputClassName}>
          <option value="">—</option>
          {Object.entries(impactLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("trading.notesLabel")} htmlFor="economic-event-notes">
        <textarea id="economic-event-notes" {...register("notes")} rows={3} className={inputClassName} />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("economicCalendar.saving") : t("common.save")}
      </button>
    </form>
  );
}
