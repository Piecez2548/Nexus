import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { holdingSchema, type HoldingFormData } from "@/features/portfolio/schemas/holdingSchema";
import { useHoldingStore } from "@/features/portfolio/store/holdingStore";
import { MARKET_LABELS } from "@/features/trading/constants/labels";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { Holding } from "@/features/portfolio/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

const blankValues: HoldingFormData = {
  symbol: "",
  market: "stocks",
  quantity: 0,
  avgCostPrice: 0,
  notes: "",
};

interface Props {
  holding: Holding | null;
  onDone: () => void;
}

export default function HoldingForm({ holding, onDone }: Props) {
  const { addHolding, updateHolding } = useHoldingStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<HoldingFormData>({
    resolver: zodResolver(holdingSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(holding ?? blankValues);
    setSubmitError(null);
  }, [holding, reset]);

  async function onSubmit(data: HoldingFormData) {
    setSubmitError(null);
    const isEditing = holding?.id !== undefined;

    try {
      if (holding?.id !== undefined) {
        await updateHolding(holding.id, { ...holding, ...data });
      } else {
        await addHolding({ ...data, createdAt: new Date().toISOString() });
      }

      onDone();
      toast.success(isEditing ? t("portfolio.updatedSuccess") : t("portfolio.savedSuccess"));
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
      <h2 className="text-xl font-bold">{holding ? t("portfolio.editFormTitle") : t("portfolio.addFormTitle")}</h2>

      <FormField label={t("portfolio.symbolLabel")} htmlFor="holding-symbol" error={errors.symbol?.message}>
        <input
          id="holding-symbol"
          {...register("symbol")}
          placeholder={t("portfolio.symbolPlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("portfolio.marketLabel")} htmlFor="holding-market" error={errors.market?.message}>
        <select id="holding-market" {...register("market")} className={inputClassName}>
          {Object.entries(MARKET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("portfolio.quantityLabel")} htmlFor="holding-quantity" error={errors.quantity?.message}>
          <input
            id="holding-quantity"
            type="number"
            step="any"
            {...register("quantity", { valueAsNumber: true })}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label={t("portfolio.avgCostPriceLabel")}
          htmlFor="holding-avg-cost"
          error={errors.avgCostPrice?.message}
        >
          <input
            id="holding-avg-cost"
            type="number"
            step="any"
            {...register("avgCostPrice", { valueAsNumber: true })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField label={t("portfolio.notesLabel")} htmlFor="holding-notes">
        <input id="holding-notes" {...register("notes")} className={inputClassName} />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("portfolio.saving") : t("common.save")}
      </button>
    </form>
  );
}
