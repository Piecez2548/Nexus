import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calendarEventSchema, type CalendarEventFormData } from "@/features/calendar/schemas/calendarEventSchema";
import { useCalendarEventStore } from "@/features/calendar/store/calendarEventStore";
import CalendarRecurringField from "@/features/calendar/components/CalendarRecurringField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { CalendarEvent } from "@/features/calendar/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function blankValues(defaultStartAt?: string): CalendarEventFormData {
  return {
    title: "",
    notes: "",
    location: "",
    startAt: defaultStartAt ?? toLocalDateTimeInputValue(new Date()),
    endAt: "",
    allDay: false,
    recurring: null,
    reminderMinutesBefore: null,
  };
}

const REMINDER_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "none", labelKey: "calendar.reminderNone" },
  { value: "0", labelKey: "calendar.reminderAtTime" },
  { value: "15", labelKey: "calendar.reminderMinutesBefore" },
  { value: "60", labelKey: "calendar.reminderHourBefore" },
  { value: "1440", labelKey: "calendar.reminderDayBefore" },
];

interface Props {
  event: CalendarEvent | null;
  defaultStartAt?: string;
  onDone: () => void;
}

export default function CalendarEventForm({ event, defaultStartAt, onDone }: Props) {
  const { addEvent, updateEvent } = useCalendarEventStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CalendarEventFormData>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: blankValues(defaultStartAt),
  });

  useEffect(() => {
    reset(event ?? blankValues(defaultStartAt));
    setSubmitError(null);
  }, [event, defaultStartAt, reset]);

  const allDay = watch("allDay");

  async function onSubmit(data: CalendarEventFormData) {
    setSubmitError(null);
    const isEditing = event?.id !== undefined;

    try {
      if (event?.id !== undefined) {
        await updateEvent(event.id, { ...event, ...data });
      } else {
        await addEvent({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("calendar.updatedSuccess") : t("calendar.savedSuccess"));
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
      <h2 className="text-xl font-bold">{event ? t("calendar.editFormTitle") : t("calendar.addFormTitle")}</h2>

      <FormField label={t("calendar.titleLabel")} htmlFor="event-title" error={errors.title?.message}>
        <input
          id="event-title"
          {...register("title")}
          placeholder={t("calendar.titlePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" {...register("allDay")} />
        {t("calendar.allDayLabel")}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("calendar.startAtLabel")} htmlFor="event-start" error={errors.startAt?.message}>
          <Controller
            name="startAt"
            control={control}
            render={({ field }) => (
              <input
                id="event-start"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? field.value.slice(0, 10) : field.value}
                onChange={(e) => field.onChange(allDay ? `${e.target.value}T00:00` : e.target.value)}
                className={inputClassName}
              />
            )}
          />
        </FormField>

        <FormField label={t("calendar.endAtLabel")} htmlFor="event-end">
          <Controller
            name="endAt"
            control={control}
            render={({ field }) => (
              <input
                id="event-end"
                type={allDay ? "date" : "datetime-local"}
                value={field.value ? (allDay ? field.value.slice(0, 10) : field.value) : ""}
                onChange={(e) =>
                  field.onChange(e.target.value ? (allDay ? `${e.target.value}T00:00` : e.target.value) : "")
                }
                className={inputClassName}
              />
            )}
          />
        </FormField>
      </div>

      <FormField label={t("calendar.locationLabel")} htmlFor="event-location">
        <input id="event-location" {...register("location")} className={inputClassName} />
      </FormField>

      <FormField label={t("calendar.notesLabel")} htmlFor="event-notes">
        <textarea id="event-notes" {...register("notes")} rows={3} className={inputClassName} />
      </FormField>

      <CalendarRecurringField control={control} />

      <FormField label={t("calendar.reminderLabel")} htmlFor="event-reminder">
        <Controller
          name="reminderMinutesBefore"
          control={control}
          render={({ field }) => (
            <select
              id="event-reminder"
              value={field.value == null ? "none" : String(field.value)}
              onChange={(e) => field.onChange(e.target.value === "none" ? null : Number(e.target.value))}
              className={inputClassName}
            >
              {REMINDER_OPTIONS.map(({ value, labelKey }) => (
                <option key={value} value={value}>
                  {t(labelKey, value === "15" ? { count: 15 } : undefined)}
                </option>
              ))}
            </select>
          )}
        />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("calendar.saving") : t("common.save")}
      </button>
    </form>
  );
}
