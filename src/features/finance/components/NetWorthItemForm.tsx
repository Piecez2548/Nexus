import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  netWorthItemSchema,
  type NetWorthItemFormData,
} from "@/features/finance/schemas/netWorthItemSchema";
import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";
import {
  getIcon,
  NET_WORTH_ASSET_ICON_OPTIONS,
  NET_WORTH_LIABILITY_ICON_OPTIONS,
} from "@/features/finance/constants/icons";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { AssetCategory, LiabilityCategory, NetWorthItem, NetWorthItemKind } from "@/features/finance/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const ASSET_CATEGORIES: AssetCategory[] = ["cash", "bank", "investment", "property", "vehicle", "crypto", "other"];
const LIABILITY_CATEGORIES: LiabilityCategory[] = ["creditCard", "loan", "mortgage", "other"];

const CATEGORY_LABEL_KEYS: Record<AssetCategory | LiabilityCategory, string> = {
  cash: "netWorth.categories.cash",
  bank: "netWorth.categories.bank",
  investment: "netWorth.categories.investment",
  property: "netWorth.categories.property",
  vehicle: "netWorth.categories.vehicle",
  crypto: "netWorth.categories.crypto",
  creditCard: "netWorth.categories.creditCard",
  loan: "netWorth.categories.loan",
  mortgage: "netWorth.categories.mortgage",
  other: "netWorth.categories.other",
};

function blankValuesFor(kind: NetWorthItemKind): NetWorthItemFormData {
  return kind === "asset"
    ? { kind: "asset", name: "", category: "cash", value: 0, icon: "wallet", color: "#16a34a" }
    : { kind: "liability", name: "", category: "creditCard", value: 0, icon: "credit-card", color: "#dc2626" };
}

interface Props {
  item: NetWorthItem | null;
  onDone: () => void;
}

export default function NetWorthItemForm({ item, onDone }: Props) {
  const { addItem, updateItem } = useNetWorthItemStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => netWorthItemSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NetWorthItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValuesFor("asset"),
  });

  useEffect(() => {
    reset(item ?? blankValuesFor("asset"));
    setSubmitError(null);
  }, [item, reset]);

  const kind = watch("kind");
  const categories = kind === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  const iconOptions = kind === "asset" ? NET_WORTH_ASSET_ICON_OPTIONS : NET_WORTH_LIABILITY_ICON_OPTIONS;
  const SelectedIcon = getIcon(watch("icon"));

  // Switching kind mid-edit resets category/icon/color to that kind's own
  // defaults -- a category (or icon) valid for the old kind is essentially
  // never valid for the new one (mirrors PendingPaymentSheet's type toggle
  // clearing its category chip for the same reason).
  function handleKindChange(next: NetWorthItemKind) {
    const blank = blankValuesFor(next);
    setValue("kind", next);
    setValue("category", blank.category);
    setValue("icon", blank.icon);
    setValue("color", blank.color);
  }

  async function onSubmit(data: NetWorthItemFormData) {
    setSubmitError(null);
    const isEditing = item?.id !== undefined;

    try {
      if (item?.id !== undefined) {
        await updateItem(item.id, { ...item, ...data });
      } else {
        await addItem({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("netWorth.updatedSuccess") : t("netWorth.savedSuccess"));
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
        {item ? t("netWorth.editItem") : t("netWorth.addItem")}
      </h2>

      <FormField label={t("netWorth.kindLabel")} htmlFor="net-worth-kind">
        <div className="flex gap-2">
          {(["asset", "liability"] as const).map((option) => {
            const active = kind === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleKindChange(option)}
                aria-pressed={active}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
                }`}
              >
                {t(option === "asset" ? "netWorth.asset" : "netWorth.liability")}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label={t("netWorth.nameLabel")} htmlFor="net-worth-name" error={errors.name?.message}>
        <input
          id="net-worth-name"
          {...register("name")}
          placeholder={t("netWorth.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("netWorth.categoryLabel")} htmlFor="net-worth-category">
        <select id="net-worth-category" {...register("category")} className={inputClassName}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {t(CATEGORY_LABEL_KEYS[category])}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("netWorth.valueLabel")} htmlFor="net-worth-value" error={errors.value?.message}>
        <input
          id="net-worth-value"
          type="number"
          step="any"
          {...register("value", { valueAsNumber: true })}
          placeholder="0"
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("netWorth.iconLabel")} htmlFor="net-worth-icon">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: watch("color") }}
          >
            <SelectedIcon size={20} />
          </div>

          <select id="net-worth-icon" {...register("icon")} className={inputClassName}>
            {iconOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label={t("netWorth.colorLabel")} htmlFor="net-worth-color">
        <input
          id="net-worth-color"
          type="color"
          {...register("color")}
          className="h-11 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1"
        />
      </FormField>

      <FormField label={t("netWorth.noteLabel")} htmlFor="net-worth-note">
        <input
          id="net-worth-note"
          {...register("note")}
          placeholder={t("netWorth.notePlaceholder")}
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
        {isSubmitting ? t("netWorth.saving") : t("common.save")}
      </button>
    </form>
  );
}
