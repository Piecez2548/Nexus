import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useCategoryStore } from "@/features/finance/store/categoryStore";
import CategoryTable from "@/features/finance/components/CategoryTable";
import CategoryForm from "@/features/finance/components/CategoryForm";
import MergeCategoryForm from "@/features/finance/components/MergeCategoryForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Category } from "@/features/finance/types";

type DrawerState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; category: Category }
  | { mode: "merge"; category: Category };

export default function Categories() {
  const { categories, loading, error, loadCategories } = useCategoryStore();
  const [drawerState, setDrawerState] = useState<DrawerState>({ mode: "closed" });
  const { t } = useTranslation();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const closeDrawer = () => setDrawerState({ mode: "closed" });

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("categories.pageTitle")}</h1>

        <button
          onClick={() => setDrawerState({ mode: "add" })}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          {t("categories.addCategory")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : loading && categories.length === 0 ? (
        <LoadingState label={t("categories.loading")} />
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("categories.emptyState")}
        </div>
      ) : (
        <CategoryTable
          categories={categories}
          onEdit={(category) => setDrawerState({ mode: "edit", category })}
          onMerge={(category) => setDrawerState({ mode: "merge", category })}
        />
      )}

      <Drawer open={drawerState.mode !== "closed"} onClose={closeDrawer}>
        {drawerState.mode === "merge" ? (
          <MergeCategoryForm
            sourceCategory={drawerState.category}
            categories={categories}
            onDone={closeDrawer}
          />
        ) : (
          <CategoryForm
            category={drawerState.mode === "edit" ? drawerState.category : null}
            onDone={closeDrawer}
          />
        )}
      </Drawer>

    </div>
  );
}
