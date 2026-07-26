import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  budgetSchema,
  type BudgetFormData,
} from "@/features/finance/schemas/budgetSchema";
import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import type { Budget } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const PERIOD_LABELS: Record<BudgetFormData["period"], string> = {
  monthly: "รายเดือน",
  weekly: "รายสัปดาห์",
  yearly: "รายปี",
};

const blankValues: BudgetFormData = {
  category: "",
  amount: 0,
  period: "monthly",
};

interface Props {
  budget: Budget | null;
  onDone: () => void;
}

export default function BudgetForm({ budget, onDone }: Props) {
  const { addBudget, updateBudget } = useBudgetStore();
  const { categories } = useCategoryStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(budget ?? blankValues);
    setSubmitError(null);
  }, [budget, reset]);

  async function onSubmit(data: BudgetFormData) {
    setSubmitError(null);
    const isEditing = budget?.id !== undefined;

    try {
      if (budget?.id !== undefined) {
        await updateBudget(budget.id, data);
      } else {
        await addBudget(data);
      }

      onDone();
      toast.success(isEditing ? "แก้ไขงบประมาณเรียบร้อย" : "ตั้งงบประมาณเรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    }
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">
        {budget ? "แก้ไขงบประมาณ" : "ตั้งงบประมาณ"}
      </h2>

      <FormField label="หมวดหมู่" htmlFor="budget-category" error={errors.category?.message}>
        <select id="budget-category" {...register("category")} className={inputClassName}>
          <option value="">เลือกหมวดหมู่</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="จำนวนเงิน" htmlFor="budget-amount" error={errors.amount?.message}>
        <input
          id="budget-amount"
          type="number"
          step="any"
          {...register("amount", { valueAsNumber: true })}
          className={inputClassName}
        />
      </FormField>

      <FormField label="รอบงบประมาณ" htmlFor="budget-period">
        <select id="budget-period" {...register("period")} className={inputClassName}>
          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
