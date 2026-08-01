import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useBudgetStore } from "@/features/finance/store/budgetStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import ProgressBar from "@/components/ui/ProgressBar";
import IconBadge from "@/components/ui/IconBadge";
import MobileRowCard from "@/components/ui/MobileRowCard";
import { STATUS_COLOR } from "@/features/finance/constants/budgetStatus";
import { useTranslation } from "@/i18n/useTranslation";
import type { BudgetProgress } from "@/features/finance/hooks/useBudgetProgress";

interface Props {
  progressList: BudgetProgress[];
  onEdit: (progress: BudgetProgress) => void;
}

export default function BudgetTable({ progressList, onEdit }: Props) {
  const { deleteBudget } = useBudgetStore();
  const { categories } = useCategoryStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();

  async function handleDelete(progress: BudgetProgress) {
    if (progress.budget.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteBudget(progress.budget.id);
      toast.success(t("budget.deletedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  function categoryMeta(categoryName: string) {
    const category = categories.find((c) => c.name === categoryName);
    return {
      Icon: getIcon(category?.icon ?? ""),
      color: category?.color ?? "#71717a",
    };
  }

  return (
    <div>

      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {progressList.map((progress) => {
          const { budget, spent, remaining, percentage, status } = progress;
          const { Icon, color } = categoryMeta(budget.category);

          return (
            <MobileRowCard
              key={budget.id}
              leading={<IconBadge icon={<Icon size={16} />} color={color} size={36} />}
              title={budget.category}
              subtitle={
                <>
                  <div>{t(`common.${budget.period}`)}</div>
                  <div className="mt-2">
                    <ProgressBar percentage={percentage} colorClass={STATUS_COLOR[status]} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span>
                      ฿{spent.toLocaleString()} / ฿{budget.amount.toLocaleString()}
                    </span>
                    <span className={remaining < 0 ? "text-red-400" : "text-zinc-600 dark:text-zinc-500"}>
                      {remaining < 0
                        ? t("budget.over", { amount: Math.abs(remaining).toLocaleString() })
                        : t("budget.remainingAmount", { amount: remaining.toLocaleString() })}
                    </span>
                  </div>
                </>
              }
              actions={
                <>
                  <button
                    onClick={() => onEdit(progress)}
                    aria-label={`Edit ${budget.category} budget`}
                    className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(progress)}
                    aria-label={`Delete ${budget.category} budget`}
                    className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              }
            />
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg md:block">

      <div className="overflow-x-auto">
        <table className="min-w-full">

          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950">
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              <th className="px-6 py-4 text-left">{t("common.category")}</th>
              <th className="px-6 py-4 text-left">{t("budget.period")}</th>
              <th className="px-6 py-4 text-left">{t("budget.progress")}</th>
              <th className="px-6 py-4 text-right">{t("budget.spentOfBudget")}</th>
              <th className="px-6 py-4 text-right">{t("budget.remaining")}</th>
              <th className="px-6 py-4 text-center">{t("common.action")}</th>
            </tr>
          </thead>

          <tbody>
            {progressList.map((progress) => {
              const { budget, spent, remaining, percentage, status } = progress;
              const { Icon, color } = categoryMeta(budget.category);

              return (
                <tr
                  key={budget.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <IconBadge icon={<Icon size={16} />} color={color} size={32} />
                      <span className="font-medium">{budget.category}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                    {t(`common.${budget.period}`)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="w-40">
                      <ProgressBar percentage={percentage} colorClass={STATUS_COLOR[status]} />
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">
                    ฿{spent.toLocaleString()} / ฿{budget.amount.toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <span className={remaining < 0 ? "text-red-400" : "text-zinc-600 dark:text-zinc-500"}>
                      {remaining < 0
                        ? t("budget.over", { amount: Math.abs(remaining).toLocaleString() })
                        : t("budget.remainingAmount", { amount: remaining.toLocaleString() })}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => onEdit(progress)}
                        aria-label={`Edit ${budget.category} budget`}
                        className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(progress)}
                        aria-label={`Delete ${budget.category} budget`}
                        className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      </div>

    </div>
  );
}
