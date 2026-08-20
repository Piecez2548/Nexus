import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { watchlistSchema, type WatchlistFormData } from "@/features/trading/schemas/watchlistSchema";
import { useWatchlistStore } from "@/features/trading/store/watchlistStore";
import { getMarketLabels } from "@/features/trading/constants/labels";
import { numberOrUndefined } from "@/utils/numberField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import type { WatchlistItem } from "@/features/trading/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: WatchlistFormData = {
  symbol: "",
  market: "stocks",
  targetPrice: undefined,
  notes: "",
};

interface Props {
  item: WatchlistItem | null;
  onDone: () => void;
}

export default function WatchlistForm({ item, onDone }: Props) {
  const { addWatchlistItem, updateWatchlistItem } = useWatchlistStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => watchlistSchema(t), [t]);
  const marketLabels = getMarketLabels(t);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WatchlistFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(item ?? blankValues);
    setSubmitError(null);
  }, [item, reset]);

  async function onSubmit(data: WatchlistFormData) {
    setSubmitError(null);
    const isEditing = item?.id !== undefined;
    const payload: WatchlistItem = {
      symbol: data.symbol,
      market: data.market,
      targetPrice: data.targetPrice,
      notes: data.notes || undefined,
    };

    try {
      if (item?.id !== undefined) {
        await updateWatchlistItem(item.id, payload);
      } else {
        await addWatchlistItem(payload);
      }

      onDone();
      toast.success(isEditing ? t("watchlist.updatedSuccess") : t("watchlist.savedSuccess"));
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
      <h2 className="text-xl font-bold">{item ? t("watchlist.editItem") : t("watchlist.addItem")}</h2>

      <FormField label={t("trading.symbol")} htmlFor="watchlist-symbol" error={errors.symbol?.message}>
        <input id="watchlist-symbol" {...register("symbol")} className={inputClassName} />
      </FormField>

      <FormField label={t("trading.market")} htmlFor="watchlist-market">
        <select id="watchlist-market" {...register("market")} className={inputClassName}>
          {Object.entries(marketLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("watchlist.targetPriceLabel")} htmlFor="watchlist-target-price">
        <input
          id="watchlist-target-price"
          type="number"
          step="any"
          {...register("targetPrice", { setValueAs: numberOrUndefined })}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("trading.notesLabel")} htmlFor="watchlist-notes">
        <textarea id="watchlist-notes" {...register("notes")} rows={3} className={inputClassName} />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("watchlist.saving") : t("common.save")}
      </button>
    </form>
  );
}
