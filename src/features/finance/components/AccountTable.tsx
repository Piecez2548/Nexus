import { useState } from "react";
import { Pencil, Trash2, Merge } from "lucide-react";

import { useAccountStore } from "@/features/finance/store/accountStore";
import { getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import IconBadge from "@/components/ui/IconBadge";
import type { Account } from "@/features/finance/types";

const ACCOUNT_TYPE_LABELS: Record<Account["type"], string> = {
  cash: "เงินสด",
  bank: "ธนาคาร",
  credit_card: "บัตรเครดิต",
  investment: "การลงทุน",
  crypto: "คริปโต",
  loan: "เงินกู้",
  digital_wallet: "กระเป๋าเงินดิจิทัล",
  other: "อื่นๆ",
};

interface Props {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onMerge: (account: Account) => void;
}

export default function AccountTable({ accounts, onEdit, onMerge }: Props) {
  const { deleteAccount } = useAccountStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(account: Account) {
    if (account.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteAccount(account.id, account.name);
      toast.success("ลบบัญชีเรียบร้อย");
    } catch (err) {
      const message = toErrorMessage(err);
      setDeleteError(message);
      toast.error(message);
    }
  }

  const canMerge = (account: Account) => accounts.some((a) => a.id !== account.id);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">

      {deleteError && (
        <div className="border-b border-red-900/50 bg-red-950/30 px-6 py-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {accounts.map((account) => {
          const Icon = getIcon(account.icon);

          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
            >
              <div className="flex items-center gap-3">
                <IconBadge icon={<Icon size={18} />} color={account.color} />

                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-500">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {canMerge(account) && (
                  <button
                    onClick={() => onMerge(account)}
                    aria-label={`Merge ${account.name}`}
                    className="rounded-lg p-2 transition hover:bg-amber-600/20 hover:text-amber-400"
                  >
                    <Merge size={18} />
                  </button>
                )}

                <button
                  onClick={() => onEdit(account)}
                  aria-label={`Edit ${account.name}`}
                  className="rounded-lg p-2 transition hover:bg-violet-600/20 hover:text-violet-400"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={() => handleDelete(account)}
                  aria-label={`Delete ${account.name}`}
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
