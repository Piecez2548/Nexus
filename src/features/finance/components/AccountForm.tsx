import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  accountSchema,
  type AccountFormData,
} from "@/features/finance/schemas/accountSchema";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { ACCOUNT_ICON_OPTIONS, getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import type { Account } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

const ACCOUNT_TYPE_LABELS: Record<AccountFormData["type"], string> = {
  cash: "เงินสด",
  bank: "ธนาคาร",
  credit_card: "บัตรเครดิต",
  investment: "การลงทุน",
  crypto: "คริปโต",
  loan: "เงินกู้",
  digital_wallet: "กระเป๋าเงินดิจิทัล",
  other: "อื่นๆ",
};

const blankValues: AccountFormData = {
  name: "",
  type: "cash",
  icon: "wallet",
  color: "#3b82f6",
};

interface Props {
  account: Account | null;
  onDone: () => void;
}

export default function AccountForm({ account, onDone }: Props) {
  const { addAccount, updateAccount } = useAccountStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(account ?? blankValues);
    setSubmitError(null);
  }, [account, reset]);

  const SelectedIcon = getIcon(watch("icon"));

  async function onSubmit(data: AccountFormData) {
    setSubmitError(null);
    const isEditing = account?.id !== undefined;

    try {
      if (account?.id !== undefined) {
        await updateAccount(account.id, data);
      } else {
        await addAccount(data);
      }

      onDone();
      toast.success(isEditing ? "แก้ไขบัญชีเรียบร้อย" : "เพิ่มบัญชีเรียบร้อย");
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
        {account ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}
      </h2>

      <FormField label="ชื่อบัญชี" htmlFor="account-name" error={errors.name?.message}>
        <input
          id="account-name"
          {...register("name")}
          placeholder="เช่น กระเป๋าสตางค์, บัญชีออมทรัพย์"
          className={inputClassName}
        />
      </FormField>

      <FormField label="ประเภทบัญชี" htmlFor="account-type">
        <select id="account-type" {...register("type")} className={inputClassName}>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="ไอคอน" htmlFor="account-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="account-icon" {...register("icon")} className={inputClassName}>
            {ACCOUNT_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label="สี" htmlFor="account-color">
        <input
          id="account-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
