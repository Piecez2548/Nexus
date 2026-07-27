import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "@/i18n/useTranslation";
import type { CalendarEventFormData } from "@/features/calendar/schemas/calendarEventSchema";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  control: Control<CalendarEventFormData>;
}

export default function CalendarRecurringField({ control }: Props) {
  const { t } = useTranslation();

  return (
    <Controller
      name="recurring"
      control={control}
      render={({ field }) => (
        <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={field.value != null}
              onChange={(e) => field.onChange(e.target.checked ? { frequency: "monthly" } : null)}
            />
            {t("calendar.recurringLabel")}
          </label>

          {field.value != null && (
            <select
              value={field.value.frequency}
              onChange={(e) => field.onChange({ frequency: e.target.value })}
              className={inputClassName}
            >
              <option value="daily">{t("common.daily")}</option>
              <option value="weekly">{t("common.weekly")}</option>
              <option value="monthly">{t("common.monthly")}</option>
              <option value="yearly">{t("common.yearly")}</option>
            </select>
          )}
        </div>
      )}
    />
  );
}
