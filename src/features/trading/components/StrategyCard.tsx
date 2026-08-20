import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useStrategyStore } from "@/features/trading/store/strategyStore";
import { getMarketLabels } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";
import type { Strategy } from "@/features/trading/types";

interface Props {
  strategies: Strategy[];
  onEdit: (strategy: Strategy) => void;
}

export default function StrategyCard({ strategies, onEdit }: Props) {
  const { deleteStrategy } = useStrategyStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const marketLabels = getMarketLabels(t);

  async function handleDelete(strategy: Strategy) {
    if (strategy.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteStrategy(strategy.id);
      toast.success(t("strategies.deletedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div>
      {deleteError && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className="flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate font-semibold">{strategy.name}</h3>

              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => onEdit(strategy)}
                  aria-label={t("common.editName", { name: strategy.name })}
                  className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(strategy)}
                  aria-label={t("common.deleteName", { name: strategy.name })}
                  className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {strategy.market && (
              <span className="mt-2 inline-block w-fit rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                {marketLabels[strategy.market]}
              </span>
            )}

            {strategy.description && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{strategy.description}</p>
            )}

            {strategy.entryRules && (
              <p className="mt-3 line-clamp-3 text-sm text-zinc-700 dark:text-zinc-300">{strategy.entryRules}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
