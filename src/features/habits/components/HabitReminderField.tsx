import { Controller, type Control } from "react-hook-form";

import WeekdayPicker from "@/features/reminders/components/WeekdayPicker";
import { useTranslation } from "@/i18n/useTranslation";
import type { HabitFormData } from "@/features/habits/schemas/habitSchema";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  control: Control<HabitFormData>;
}

export default function HabitReminderField({ control }: Props) {
  const { t } = useTranslation();

  return (
    <Controller
      name="reminderEnabled"
      control={control}
      render={({ field: enabledField }) => (
        <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={enabledField.value ?? false}
              onChange={(e) => enabledField.onChange(e.target.checked)}
            />
            {t("habits.reminderLabel")}
          </label>

          {enabledField.value && (
            <>
              <Controller
                name="reminderTime"
                control={control}
                render={({ field }) => (
                  <input
                    type="time"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={inputClassName}
                    aria-label={t("habits.reminderTimeLabel")}
                  />
                )}
              />

              <Controller
                name="reminderRepeat"
                control={control}
                render={({ field }) => {
                  const repeat = field.value ?? { frequency: "daily" as const };
                  return (
                    <div className="space-y-2">
                      <select
                        value={repeat.frequency}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "daily"
                              ? { frequency: "daily" }
                              : { frequency: "weekly", weekdays: [] }
                          )
                        }
                        className={inputClassName}
                        aria-label={t("habits.reminderRepeatLabel")}
                      >
                        <option value="daily">{t("habits.reminderRepeatDaily")}</option>
                        <option value="weekly">{t("habits.reminderRepeatWeekly")}</option>
                      </select>

                      {repeat.frequency === "weekly" && (
                        <WeekdayPicker
                          value={"weekdays" in repeat ? repeat.weekdays : []}
                          onChange={(weekdays) => field.onChange({ frequency: "weekly", weekdays })}
                        />
                      )}
                    </div>
                  );
                }}
              />
            </>
          )}
        </div>
      )}
    />
  );
}
