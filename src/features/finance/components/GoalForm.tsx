import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  goalSchema,
  type GoalFormData,
} from "@/features/finance/schemas/goalSchema";
import { useGoalStore } from "@/features/finance/store/goalStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import type { Goal } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: GoalFormData = {
  name: "",
  targetAmount: 0,
  currentAmount: 0,
  deadline: "",
};

interface Props {
  goal: Goal | null;
  onDone: () => void;
}

export default function GoalForm({ goal, onDone }: Props) {
  const { addGoal, updateGoal } = useGoalStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(goal ?? blankValues);
    setSubmitError(null);
  }, [goal, reset]);

  async function onSubmit(data: GoalFormData) {
    setSubmitError(null);
    const isEditing = goal?.id !== undefined;

    try {
      if (goal?.id !== undefined) {
        await updateGoal(goal.id, data);
      } else {
        await addGoal(data);
      }

      onDone();
      toast.success(isEditing ? "แก้ไขเป้าหมายเรียบร้อย" : "สร้างเป้าหมายเรียบร้อย");
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
        {goal ? "แก้ไขเป้าหมาย" : "สร้างเป้าหมายการออม"}
      </h2>

      <FormField label="ชื่อเป้าหมาย" htmlFor="goal-name" error={errors.name?.message}>
        <input
          id="goal-name"
          {...register("name")}
          placeholder="เช่น ซื้อรถ, เงินฉุกเฉิน"
          className={inputClassName}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="เป้าหมาย (บาท)" htmlFor="goal-target" error={errors.targetAmount?.message}>
          <input
            id="goal-target"
            type="number"
            step="any"
            {...register("targetAmount", { valueAsNumber: true })}
            className={inputClassName}
          />
        </FormField>

        <FormField label="ปัจจุบัน (บาท)" htmlFor="goal-current" error={errors.currentAmount?.message}>
          <input
            id="goal-current"
            type="number"
            step="any"
            {...register("currentAmount", { valueAsNumber: true })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField label="กำหนดเวลา (ถ้ามี)" htmlFor="goal-deadline">
        <input
          id="goal-deadline"
          type="date"
          {...register("deadline")}
          className={inputClassName}
        />
      </FormField>

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
