import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  categorySchema,
  type CategoryFormData,
} from "@/features/finance/schemas/categorySchema";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { CATEGORY_ICON_OPTIONS, getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import type { Category } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

const blankValues: CategoryFormData = {
  name: "",
  type: "expense",
  icon: "utensils",
  color: "#3b82f6",
};

interface Props {
  category: Category | null;
  onDone: () => void;
}

export default function CategoryForm({ category, onDone }: Props) {
  const { addCategory, updateCategory } = useCategoryStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(category ?? blankValues);
    setSubmitError(null);
  }, [category, reset]);

  const SelectedIcon = getIcon(watch("icon"));

  async function onSubmit(data: CategoryFormData) {
    setSubmitError(null);
    const isEditing = category?.id !== undefined;

    try {
      if (category?.id !== undefined) {
        await updateCategory(category.id, data);
      } else {
        await addCategory(data);
      }

      onDone();
      toast.success(isEditing ? "แก้ไขหมวดหมู่เรียบร้อย" : "เพิ่มหมวดหมู่เรียบร้อย");
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
        {category ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
      </h2>

      <FormField label="ชื่อหมวดหมู่" htmlFor="category-name" error={errors.name?.message}>
        <input
          id="category-name"
          {...register("name")}
          placeholder="เช่น อาหาร, เดินทาง"
          className={inputClassName}
        />
      </FormField>

      <FormField label="ประเภท" htmlFor="category-type">
        <select id="category-type" {...register("type")} className={inputClassName}>
          <option value="expense">รายจ่าย</option>
          <option value="income">รายรับ</option>
        </select>
      </FormField>

      <FormField label="ไอคอน" htmlFor="category-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="category-icon" {...register("icon")} className={inputClassName}>
            {CATEGORY_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label="สี" htmlFor="category-color">
        <input
          id="category-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
