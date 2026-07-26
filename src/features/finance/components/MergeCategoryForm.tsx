import { useState, type FormEvent } from "react";

import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import type { Category } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  sourceCategory: Category;
  categories: Category[];
  onDone: () => void;
}

export default function MergeCategoryForm({ sourceCategory, categories, onDone }: Props) {
  const { mergeCategory } = useCategoryStore();
  const [targetName, setTargetName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const candidates = categories.filter(
    (c) => c.id !== sourceCategory.id && c.type === sourceCategory.type
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!targetName || sourceCategory.id === undefined) return;

    setSubmitting(true);
    setError(null);

    try {
      await mergeCategory(sourceCategory.id, sourceCategory.name, targetName);
      onDone();
      toast.success("รวมหมวดหมู่เรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">
        รวมหมวดหมู่ "{sourceCategory.name}"
      </h2>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        รายการทั้งหมดในหมวดหมู่นี้จะถูกย้ายไปยังหมวดหมู่ที่เลือก แล้วหมวดหมู่นี้จะถูกลบ
      </p>

      <FormField label="รวมเข้ากับ" htmlFor="merge-target">
        <select
          id="merge-target"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          className={inputClassName}
        >
          <option value="">เลือกหมวดหมู่ปลายทาง</option>

          {candidates.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !targetName}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังรวม..." : "รวมหมวดหมู่"}
      </button>
    </form>
  );
}
