import { useState } from "react";
import { Pencil, Trash2, Merge } from "lucide-react";

import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import IconBadge from "@/components/ui/IconBadge";
import type { Category } from "@/features/finance/types";

interface Props {
  categories: Category[];
  onEdit: (category: Category) => void;
  onMerge: (category: Category) => void;
}

export default function CategoryTable({ categories, onEdit, onMerge }: Props) {
  const { deleteCategory } = useCategoryStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(category: Category) {
    if (category.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteCategory(category.id, category.name);
      toast.success("ลบหมวดหมู่เรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  const canMerge = (category: Category) =>
    categories.some((c) => c.id !== category.id && c.type === category.type);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">

      {deleteError && (
        <div className="border-b border-red-900/50 bg-red-950/30 px-6 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {categories.map((category) => {
          const Icon = getIcon(category.icon);

          return (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
            >
              <div className="flex items-center gap-3">
                <IconBadge icon={<Icon size={18} />} color={category.color} />

                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-500">
                    {category.type === "income" ? "รายรับ" : "รายจ่าย"}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {canMerge(category) && (
                  <button
                    onClick={() => onMerge(category)}
                    aria-label={`Merge ${category.name}`}
                    className="rounded-lg p-2 transition hover:bg-amber-600/20 hover:text-amber-400"
                  >
                    <Merge size={18} />
                  </button>
                )}

                <button
                  onClick={() => onEdit(category)}
                  aria-label={`Edit ${category.name}`}
                  className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => handleDelete(category)}
                  aria-label={`Delete ${category.name}`}
                  className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
