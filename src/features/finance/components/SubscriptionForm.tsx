import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  subscriptionSchema,
  type SubscriptionFormData,
} from "@/features/finance/schemas/subscriptionSchema";
import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { getIcon, SUBSCRIPTION_ICON_OPTIONS } from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { toLocalDateString } from "@/utils/localDate";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { RecurringFrequency, Subscription, SubscriptionStatus } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const FREQUENCY_LABEL_KEYS: Record<RecurringFrequency, string> = {
  daily: "common.daily",
  weekly: "common.weekly",
  monthly: "common.monthly",
  yearly: "common.yearly",
};

const STATUS_LABEL_KEYS: Record<SubscriptionStatus, string> = {
  active: "subscriptions.statusActive",
  paused: "subscriptions.statusPaused",
  cancelled: "subscriptions.statusCancelled",
};

const blankValues: SubscriptionFormData = {
  name: "",
  amount: 0,
  billingFrequency: "monthly",
  nextBillingDate: toLocalDateString(new Date()),
  status: "active",
  icon: "credit-card",
  color: "#dc2626",
  reminderEnabled: false,
};

interface Props {
  subscription: Subscription | null;
  onDone: () => void;
}

export default function SubscriptionForm({ subscription, onDone }: Props) {
  const { addSubscription, updateSubscription } = useSubscriptionStore();
  const { accounts } = useAccountStore();
  const categories = useCategoryStore((s) => s.categories).filter((c) => c.type === "expense");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => subscriptionSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(subscription ?? blankValues);
    setSubmitError(null);
  }, [subscription, reset]);

  const SelectedIcon = getIcon(watch("icon"));

  async function onSubmit(data: SubscriptionFormData) {
    setSubmitError(null);
    const isEditing = subscription?.id !== undefined;

    try {
      if (subscription?.id !== undefined) {
        await updateSubscription(subscription.id, { ...subscription, ...data });
      } else {
        await addSubscription({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("subscriptions.updatedSuccess") : t("subscriptions.savedSuccess"));
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
        {subscription ? t("subscriptions.editSubscription") : t("subscriptions.addSubscription")}
      </h2>

      <FormField label={t("subscriptions.nameLabel")} htmlFor="subscription-name" error={errors.name?.message}>
        <input
          id="subscription-name"
          {...register("name")}
          placeholder={t("subscriptions.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("subscriptions.amountLabel")} htmlFor="subscription-amount" error={errors.amount?.message}>
          <input
            id="subscription-amount"
            type="number"
            step="any"
            {...register("amount", { valueAsNumber: true })}
            placeholder="0"
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("subscriptions.billingFrequencyLabel")} htmlFor="subscription-frequency">
          <select id="subscription-frequency" {...register("billingFrequency")} className={inputClassName}>
            {Object.entries(FREQUENCY_LABEL_KEYS).map(([value, labelKey]) => (
              <option key={value} value={value}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={t("subscriptions.nextBillingDateLabel")}
          htmlFor="subscription-next-billing-date"
          error={errors.nextBillingDate?.message}
        >
          <input
            id="subscription-next-billing-date"
            type="date"
            {...register("nextBillingDate")}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("subscriptions.statusLabel")} htmlFor="subscription-status">
          <select id="subscription-status" {...register("status")} className={inputClassName}>
            {Object.entries(STATUS_LABEL_KEYS).map(([value, labelKey]) => (
              <option key={value} value={value}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label={t("subscriptions.categoryLabel")} htmlFor="subscription-category">
        <select id="subscription-category" {...register("category")} className={inputClassName}>
          <option value="">{t("subscriptions.noCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("subscriptions.accountLabel")} htmlFor="subscription-account">
        <select id="subscription-account" {...register("account")} className={inputClassName}>
          <option value="">{t("subscriptions.noAccount")}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.name}>
              {account.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("subscriptions.iconLabel")} htmlFor="subscription-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="subscription-icon" {...register("icon")} className={inputClassName}>
            {SUBSCRIPTION_ICON_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label={t("subscriptions.colorLabel")} htmlFor="subscription-color">
        <input
          id="subscription-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" {...register("reminderEnabled")} />
        {t("subscriptions.reminderEnabledLabel")}
      </label>

      <FormField label={t("subscriptions.noteLabel")} htmlFor="subscription-note">
        <input
          id="subscription-note"
          {...register("note")}
          placeholder={t("subscriptions.notePlaceholder")}
          className={inputClassName}
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
        {isSubmitting ? t("subscriptions.saving") : t("common.save")}
      </button>
    </form>
  );
}
