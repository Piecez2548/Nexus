import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { scheduleItemSchema, type ScheduleItemFormData } from "@/features/schedule/schemas/scheduleItemSchema";
import { useScheduleItemStore } from "@/features/schedule/store/scheduleItemStore";
import { SCHEDULE_ICON_OPTIONS, getIcon } from "@/features/schedule/constants/icons";
import WeekdayRepeatField from "@/features/schedule/components/WeekdayRepeatField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { ScheduleItem } from "@/features/schedule/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: ScheduleItemFormData = {
  title: "",
  icon: "sunrise",
  color: "#3b82f6",
  startTime: "",
  endTime: "",
  category: "",
  notes: "",
  repeat: { frequency: "daily" },
  enabled: true,
  reminderEnabled: false,
  reminderOffsetMinutes: null,
};

interface Props {
  item: ScheduleItem | null;
  onDone: () => void;
}

export default function ScheduleItemForm({ item, onDone }: Props) {
  const { addItem, updateItem } = useScheduleItemStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => scheduleItemSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ScheduleItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(item ? { ...blankValues, ...item } : blankValues);
    setSubmitError(null);
  }, [item, reset]);

  const SelectedIcon = getIcon(watch("icon"));
  const reminderEnabled = watch("reminderEnabled");

  async function onSubmit(data: ScheduleItemFormData) {
    setSubmitError(null);
    const isEditing = item?.id !== undefined;

    try {
      if (item?.id !== undefined) {
        await updateItem(item.id, { ...item, ...data });
      } else {
        await addItem({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("schedule.updatedSuccess") : t("schedule.savedSuccess"));
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
      <h2 className="text-xl font-bold">{item ? t("schedule.editFormTitle") : t("schedule.addFormTitle")}</h2>

      <FormField label={t("schedule.titleLabel")} htmlFor="schedule-title" error={errors.title?.message}>
        <input
          id="schedule-title"
          {...register("title")}
          placeholder={t("schedule.titlePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("schedule.iconLabel")} htmlFor="schedule-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="schedule-icon" {...register("icon")} className={inputClassName}>
            {SCHEDULE_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label={t("schedule.colorLabel")} htmlFor="schedule-color">
        <input
          id="schedule-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t("schedule.startTimeLabel")} htmlFor="schedule-start" error={errors.startTime?.message}>
          <input id="schedule-start" type="time" {...register("startTime")} className={inputClassName} />
        </FormField>

        <FormField label={t("schedule.endTimeLabel")} htmlFor="schedule-end">
          <input id="schedule-end" type="time" {...register("endTime")} className={inputClassName} />
        </FormField>
      </div>

      <FormField label={t("schedule.categoryLabel")} htmlFor="schedule-category">
        <input
          id="schedule-category"
          {...register("category")}
          placeholder={t("schedule.categoryPlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("schedule.notesLabel")} htmlFor="schedule-notes">
        <textarea id="schedule-notes" {...register("notes")} rows={2} className={inputClassName} />
      </FormField>

      <FormField label={t("schedule.repeatLabel")} htmlFor="schedule-repeat">
        <WeekdayRepeatField control={control} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" {...register("enabled")} />
        {t("schedule.enabledLabel")}
      </label>

      <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" {...register("reminderEnabled")} />
          {t("schedule.reminderLabel")}
        </label>

        {reminderEnabled && (
          <select {...register("reminderOffsetMinutes", { valueAsNumber: true })} className={inputClassName}>
            <option value={0}>{t("schedule.reminderAtStart")}</option>
            <option value={5}>{t("schedule.reminderMinutesBefore", { count: 5 })}</option>
            <option value={10}>{t("schedule.reminderMinutesBefore", { count: 10 })}</option>
            <option value={15}>{t("schedule.reminderMinutesBefore", { count: 15 })}</option>
            <option value={30}>{t("schedule.reminderMinutesBefore", { count: 30 })}</option>
          </select>
        )}
      </div>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("schedule.saving") : t("common.save")}
      </button>
    </form>
  );
}
