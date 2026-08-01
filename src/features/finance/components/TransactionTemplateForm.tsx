import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  transactionTemplateSchema,
  type TransactionTemplateFormData,
} from "@/features/finance/schemas/transactionTemplateSchema";
import { useTransactionTemplateStore } from "@/features/finance/store/transactionTemplateStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { CATEGORY_ICON_OPTIONS, getIcon } from "@/features/finance/constants/icons";
import { numberOrUndefined } from "@/utils/numberField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { TransactionTemplate } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const TYPE_LABEL_KEYS: Record<TransactionTemplateFormData["type"], string> = {
  expense: "transactions.expense",
  income: "transactions.income",
  transfer: "transactions.transfer",
  refund: "transactions.refund",
  adjustment: "transactions.adjustment",
};

const blankValues: TransactionTemplateFormData = {
  name: "",
  type: "expense",
  category: "",
  account: "Cash",
  toAccount: "",
  amount: undefined,
  recipient: "",
  icon: "zap",
  color: "#8b5cf6",
};

interface Props {
  template: TransactionTemplate | null;
  onDone: () => void;
}

export default function TransactionTemplateForm({ template, onDone }: Props) {
  const { addTemplate, updateTemplate } = useTransactionTemplateStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { categories, loadCategories } = useCategoryStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => transactionTemplateSchema(t), [t]);

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, [loadAccounts, loadCategories]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionTemplateFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(template ?? blankValues);
    setSubmitError(null);
  }, [template, reset]);

  const type = watch("type");
  const needsCategory = type === "income" || type === "expense";
  const isTransfer = type === "transfer";
  const SelectedIcon = getIcon(watch("icon") ?? "zap");

  async function onSubmit(data: TransactionTemplateFormData) {
    setSubmitError(null);
    const isEditing = template?.id !== undefined;

    try {
      if (template?.id !== undefined) {
        await updateTemplate(template.id, data);
      } else {
        await addTemplate(data);
      }

      onDone();
      toast.success(isEditing ? t("quickAdd.updatedSuccess") : t("quickAdd.savedSuccess"));
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
        {template ? t("quickAdd.editTemplate") : t("quickAdd.createTemplate")}
      </h2>

      <FormField label={t("quickAdd.nameLabel")} htmlFor="template-name" error={errors.name?.message}>
        <input
          id="template-name"
          {...register("name")}
          placeholder={t("quickAdd.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("categories.iconLabel")} htmlFor="template-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="template-icon" {...register("icon")} className={inputClassName}>
            {CATEGORY_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label={t("categories.colorLabel")} htmlFor="template-color">
        <input
          id="template-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      <FormField label={t("common.type")} htmlFor="template-type">
        <select id="template-type" {...register("type")} className={inputClassName}>
          {Object.entries(TYPE_LABEL_KEYS).map(([value, labelKey]) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </FormField>

      {needsCategory && (
        <FormField label={t("common.category")} htmlFor="template-category" error={errors.category?.message}>
          <select id="template-category" {...register("category")} className={inputClassName}>
            <option value="">{t("transactions.selectCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label={isTransfer ? t("transactions.fromAccount") : t("common.account")} htmlFor="template-account">
        <select id="template-account" {...register("account")} className={inputClassName}>
          <option value="">{t("transactions.selectAccount")}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.name}>
              {account.name}
            </option>
          ))}
        </select>
      </FormField>

      {isTransfer && (
        <FormField label={t("transactions.toAccount")} htmlFor="template-to-account" error={errors.toAccount?.message}>
          <select id="template-to-account" {...register("toAccount")} className={inputClassName}>
            <option value="">{t("transactions.selectToAccount")}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label={t("quickAdd.amountLabel")} htmlFor="template-amount" error={errors.amount?.message}>
        <input
          id="template-amount"
          type="number"
          step="any"
          {...register("amount", { setValueAs: numberOrUndefined })}
          placeholder={t("quickAdd.amountPlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("quickAdd.recipientLabel")} htmlFor="template-recipient">
        <input
          id="template-recipient"
          {...register("recipient")}
          className={inputClassName}
        />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("quickAdd.saving") : t("common.save")}
      </button>
    </form>
  );
}
