import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { useMerchantStore } from "@/features/finance/store/merchantStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import IconBadge from "@/components/ui/IconBadge";
import { useTranslation } from "@/i18n/useTranslation";
import type { Merchant } from "@/features/finance/types";

// Merchant has no color field of its own (unlike Category/Account) -- a
// fixed neutral badge color, not user-customizable.
const BADGE_COLOR = "#71717a";

interface Props {
  merchants: Merchant[];
  onEdit: (merchant: Merchant) => void;
}

export default function MerchantTable({ merchants, onEdit }: Props) {
  const { deleteMerchant } = useMerchantStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();

  async function handleDelete(merchant: Merchant) {
    if (merchant.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteMerchant(merchant.id);
      toast.success(t("merchants.deletedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">

      {deleteError && (
        <div className="border-b border-red-900/50 bg-red-950/30 px-6 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {merchants.map((merchant) => {
          const Icon = getIcon(merchant.icon ?? "");

          return (
            <div
              key={merchant.id}
              className="flex items-center justify-between p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
            >
              <div className="flex items-center gap-3">
                <IconBadge icon={<Icon size={18} />} color={BADGE_COLOR} />

                <div>
                  <div className="font-medium">{merchant.name}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-500">{merchant.category}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onEdit(merchant)}
                  aria-label={`Edit ${merchant.name}`}
                  className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => handleDelete(merchant)}
                  aria-label={`Delete ${merchant.name}`}
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
