import { useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "@/i18n/useTranslation";
import type { Account } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const ACCOUNT_TYPE_LABEL_KEYS: Record<AccountFormData["type"], string> = {
  cash: "accounts.types.cash",
  bank: "accounts.types.bank",
  credit_card: "accounts.types.credit_card",
  investment: "accounts.types.investment",
  crypto: "accounts.types.crypto",
  loan: "accounts.types.loan",
  digital_wallet: "accounts.types.digital_wallet",
  other: "accounts.types.other",
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
  const { t } = useTranslation();
  const schema = useMemo(() => accountSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AccountFormData>({
    resolver: zodResolver(schema),
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
      toast.success(isEditing ? t("accounts.updatedSuccess") : t("accounts.savedSuccess"));
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
        {account ? t("accounts.editAccount") : t("accounts.addAccount")}
      </h2>

      <FormField label={t("accounts.nameLabel")} htmlFor="account-name" error={errors.name?.message}>
        <input
          id="account-name"
          {...register("name")}
          placeholder={t("accounts.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("accounts.typeLabel")} htmlFor="account-type">
        <select id="account-type" {...register("type")} className={inputClassName}>
          {Object.entries(ACCOUNT_TYPE_LABEL_KEYS).map(([value, labelKey]) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("accounts.iconLabel")} htmlFor="account-icon">
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

      <FormField label={t("accounts.colorLabel")} htmlFor="account-color">
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
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("accounts.saving") : t("common.save")}
      </button>
    </form>
  );
}
