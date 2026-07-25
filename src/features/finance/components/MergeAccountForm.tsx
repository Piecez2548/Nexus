import { useState, type FormEvent } from "react";

import { useAccountStore } from "@/features/finance/store/accountStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import type { Account } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

interface Props {
  sourceAccount: Account;
  accounts: Account[];
  onDone: () => void;
}

export default function MergeAccountForm({ sourceAccount, accounts, onDone }: Props) {
  const { mergeAccount } = useAccountStore();
  const [targetName, setTargetName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const candidates = accounts.filter((a) => a.id !== sourceAccount.id);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!targetName || sourceAccount.id === undefined) return;

    setSubmitting(true);
    setError(null);

    try {
      await mergeAccount(sourceAccount.id, sourceAccount.name, targetName);
      onDone();
      toast.success("รวมบัญชีเรียบร้อย");
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
        รวมบัญชี "{sourceAccount.name}"
      </h2>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        รายการทั้งหมดในบัญชีนี้จะถูกย้ายไปยังบัญชีที่เลือก แล้วบัญชีนี้จะถูกลบ
      </p>

      <FormField label="รวมเข้ากับ" htmlFor="merge-account-target">
        <select
          id="merge-account-target"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          className={inputClassName}
        >
          <option value="">เลือกบัญชีปลายทาง</option>

          {candidates.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
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
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "กำลังรวม..." : "รวมบัญชี"}
      </button>
    </form>
  );
}
