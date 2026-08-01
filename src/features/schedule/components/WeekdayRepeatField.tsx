import { Controller, type Control } from "react-hook-form";

import WeekdayPicker from "@/features/reminders/components/WeekdayPicker";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScheduleItemFormData } from "@/features/schedule/schemas/scheduleItemSchema";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  control: Control<ScheduleItemFormData>;
}

export default function WeekdayRepeatField({ control }: Props) {
  const { t } = useTranslation();

  return (
    <Controller
      name="repeat"
      control={control}
      render={({ field }) => (
        <div className="space-y-2">
          <select
            value={field.value.frequency}
            onChange={(e) =>
              field.onChange(e.target.value === "daily" ? { frequency: "daily" } : { frequency: "weekly", weekdays: [] })
            }
            className={inputClassName}
            aria-label={t("schedule.repeatLabel")}
          >
            <option value="daily">{t("schedule.repeatDaily")}</option>
            <option value="weekly">{t("schedule.repeatWeekly")}</option>
          </select>

          {field.value.frequency === "weekly" && (
            <WeekdayPicker
              value={"weekdays" in field.value ? field.value.weekdays : []}
              onChange={(weekdays) => field.onChange({ frequency: "weekly", weekdays })}
            />
          )}
        </div>
      )}
    />
  );
}
