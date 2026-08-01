import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { habitSchema, type HabitFormData } from "@/features/habits/schemas/habitSchema";
import { useHabitStore } from "@/features/habits/store/habitStore";
import HabitReminderField from "@/features/habits/components/HabitReminderField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { Habit } from "@/features/habits/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: HabitFormData = {
  name: "",
  frequency: "daily",
  reminderEnabled: false,
  reminderTime: "",
  reminderRepeat: { frequency: "daily" },
};

interface Props {
  habit: Habit | null;
  onDone: () => void;
}

export default function HabitForm({ habit, onDone }: Props) {
  const { addHabit, updateHabit } = useHabitStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => habitSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<HabitFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    // Merge over blankValues rather than replacing it outright — a habit
    // saved before this feature existed has no reminderRepeat at all, and
    // the form needs a concrete default the moment reminders are enabled,
    // not just a display fallback that never gets written back.
    reset(habit ? { ...blankValues, ...habit } : blankValues);
    setSubmitError(null);
  }, [habit, reset]);

  async function onSubmit(data: HabitFormData) {
    setSubmitError(null);
    const isEditing = habit?.id !== undefined;

    try {
      if (habit?.id !== undefined) {
        await updateHabit(habit.id, { ...habit, ...data });
      } else {
        await addHabit({ ...data, completedDates: [], createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("habits.updatedSuccess") : t("habits.savedSuccess"));
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
      <h2 className="text-xl font-bold">{habit ? t("habits.editFormTitle") : t("habits.addFormTitle")}</h2>

      <FormField label={t("habits.nameLabel")} htmlFor="habit-name" error={errors.name?.message}>
        <input
          id="habit-name"
          {...register("name")}
          placeholder={t("habits.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("habits.frequencyLabel")} htmlFor="habit-frequency" error={errors.frequency?.message}>
        <select id="habit-frequency" {...register("frequency")} className={inputClassName}>
          <option value="daily">{t("habits.frequencyDaily")}</option>
          <option value="weekly">{t("habits.frequencyWeekly")}</option>
        </select>
      </FormField>

      <HabitReminderField control={control} />

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("habits.saving") : t("common.save")}
      </button>
    </form>
  );
}
