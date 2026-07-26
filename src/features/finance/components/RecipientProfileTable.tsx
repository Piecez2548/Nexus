import { useState } from "react";
import { Trash2 } from "lucide-react";

import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import MobileRowCard from "@/components/ui/MobileRowCard";
import type { RecipientProfile } from "@/features/finance/types";

interface Props {
  profiles: RecipientProfile[];
}

export default function RecipientProfileTable({ profiles }: Props) {
  const { deleteProfile } = useRecipientProfileStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(profile: RecipientProfile) {
    if (profile.id === undefined) return;

    try {
      setDeleteError(null);
      await deleteProfile(profile.id);
      toast.success("ลบข้อมูลผู้รับเรียบร้อย");
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

      <div className="space-y-3 md:hidden">
        {profiles.map((profile) => (
          <MobileRowCard
            key={profile.id}
            title={profile.alias}
            subtitle={
              <>
                <div className="font-mono">{profile.recipientKey}</div>
                <div>{profile.category}</div>
              </>
            }
            trailing={
              <span className="text-base font-bold text-zinc-700 dark:text-zinc-300">
                ฿{Math.round(profile.totalAmount / profile.transactionCount).toLocaleString()}
              </span>
            }
            meta={
              <>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                  {profile.confidenceScore}%
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{profile.transactionCount} รายการ</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(profile.lastUsedDate).toLocaleDateString("th-TH")}
                </span>
              </>
            }
            actions={
              <button
                onClick={() => handleDelete(profile)}
                aria-label={`Delete ${profile.alias}`}
                className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            }
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg md:block">

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950">
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-sm uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              <th className="px-6 py-4 text-left">Recipient</th>
              <th className="px-6 py-4 text-left">Alias</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-right">Average</th>
              <th className="px-6 py-4 text-right">Count</th>
              <th className="px-6 py-4 text-left">Last Used</th>
              <th className="px-6 py-4 text-right">Confidence</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {profiles.map((profile) => (
              <tr
                key={profile.id}
                className="border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              >
                <td className="px-6 py-4 font-mono text-zinc-500 dark:text-zinc-400">{profile.recipientKey}</td>
                <td className="px-6 py-4 font-medium">{profile.alias}</td>
                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{profile.category}</td>
                <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">
                  ฿{Math.round(profile.totalAmount / profile.transactionCount).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-zinc-700 dark:text-zinc-300">{profile.transactionCount}</td>
                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                  {new Date(profile.lastUsedDate).toLocaleDateString("th-TH")}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400">
                    {profile.confidenceScore}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleDelete(profile)}
                      aria-label={`Delete ${profile.alias}`}
                      className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
