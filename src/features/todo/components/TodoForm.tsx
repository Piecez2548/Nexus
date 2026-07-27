import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  todoSchema,
  type TodoFormData,
} from "@/features/todo/schemas/todoSchema";
import { useTodoStore } from "@/features/todo/store/todoStore";
import { getPriorityLabels } from "@/features/todo/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { Todo } from "@/features/todo/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: TodoFormData = {
  title: "",
  notes: "",
  dueDate: "",
  priority: "medium",
};

interface Props {
  todo: Todo | null;
  onDone: () => void;
}

export default function TodoForm({ todo, onDone }: Props) {
  const { addTodo, updateTodo } = useTodoStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const priorityLabels = getPriorityLabels(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(todo ?? blankValues);
    setSubmitError(null);
  }, [todo, reset]);

  async function onSubmit(data: TodoFormData) {
    setSubmitError(null);
    const isEditing = todo?.id !== undefined;

    try {
      if (todo?.id !== undefined) {
        await updateTodo(todo.id, data);
      } else {
        await addTodo(data);
      }

      onDone();
      toast.success(isEditing ? t("todo.updatedSuccess") : t("todo.savedSuccess"));
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
        {todo ? t("todo.editTodo") : t("todo.addTodo")}
      </h2>

      <FormField label="ชื่องาน" htmlFor="todo-title" error={errors.title?.message}>
        <input
          id="todo-title"
          {...register("title")}
          placeholder="เช่น ส่งรายงาน, ซื้อของเข้าบ้าน"
          className={inputClassName}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="กำหนดส่ง (ถ้ามี)" htmlFor="todo-due-date">
          <input
            id="todo-due-date"
            type="date"
            {...register("dueDate")}
            className={inputClassName}
          />
        </FormField>

        <FormField label="ความสำคัญ" htmlFor="todo-priority">
          <select id="todo-priority" {...register("priority")} className={inputClassName}>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="รายละเอียด" htmlFor="todo-notes">
        <textarea
          id="todo-notes"
          {...register("notes")}
          rows={3}
          placeholder="รายละเอียดเพิ่มเติม"
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
