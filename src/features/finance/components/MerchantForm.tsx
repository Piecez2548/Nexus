import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  merchantSchema,
  type MerchantFormData,
} from "@/features/finance/schemas/merchantSchema";
import { useMerchantStore } from "@/features/finance/store/merchantStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { CATEGORY_ICON_OPTIONS, getIcon } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { Merchant } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: MerchantFormData = {
  name: "",
  category: "",
  icon: "",
};

interface Props {
  merchant: Merchant | null;
  onDone: () => void;
}

export default function MerchantForm({ merchant, onDone }: Props) {
  const { addMerchant, updateMerchant } = useMerchantStore();
  const { categories } = useCategoryStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => merchantSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MerchantFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(merchant ?? blankValues);
    setSubmitError(null);
  }, [merchant, reset]);

  const SelectedIcon = getIcon(watch("icon") ?? "");

  async function onSubmit(data: MerchantFormData) {
    setSubmitError(null);
    const isEditing = merchant?.id !== undefined;
    // icon is optional on the entity -- an empty select value means "none".
    const payload: Merchant = { name: data.name, category: data.category, icon: data.icon || undefined };

    try {
      if (merchant?.id !== undefined) {
        await updateMerchant(merchant.id, payload);
      } else {
        await addMerchant(payload);
      }

      onDone();
      toast.success(isEditing ? t("merchants.updatedSuccess") : t("merchants.savedSuccess"));
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
        {merchant ? t("merchants.editMerchant") : t("merchants.addMerchant")}
      </h2>

      <FormField label={t("merchants.nameLabel")} htmlFor="merchant-name" error={errors.name?.message}>
        <input
          id="merchant-name"
          {...register("name")}
          placeholder={t("merchants.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("merchants.categoryLabel")} htmlFor="merchant-category" error={errors.category?.message}>
        <select id="merchant-category" {...register("category")} className={inputClassName}>
          <option value="">{t("merchants.selectCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("merchants.iconLabel")} htmlFor="merchant-icon">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800">
            <SelectedIcon size={20} />
          </div>

          <select id="merchant-icon" {...register("icon")} className={inputClassName}>
            <option value="">{t("merchants.noIcon")}</option>
            {CATEGORY_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("merchants.saving") : t("common.save")}
      </button>
    </form>
  );
}
