import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  tradeSchema,
  type TradeFormData,
} from "@/features/trading/schemas/tradeSchema";
import { useTradeStore } from "@/features/trading/store/tradeStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";
import { useStrategyStore } from "@/features/trading/store/strategyStore";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import { toLocalDateString } from "@/utils/localDate";

import TradeCoreFields from "@/features/trading/components/TradeCoreFields";
import TradeRiskFields from "@/features/trading/components/TradeRiskFields";
import TradeRiskCalculator from "@/features/trading/components/TradeRiskCalculator";
import TradePsychologyFields from "@/features/trading/components/TradePsychologyFields";
import TradeMetaFields from "@/features/trading/components/TradeMetaFields";
import { useTranslation } from "@/i18n/useTranslation";

const blankValues: TradeFormData = {
  symbol: "",
  market: "stocks",
  direction: "long",
  status: "open",
  entryPrice: 0,
  quantity: 0,
  entryDate: toLocalDateString(new Date()),
  tags: [],
  screenshots: [],
};

export default function TradeForm() {
  const { addTrade, updateTrade } = useTradeStore();
  const { selectedTrade, closeTradeDrawer } = useTradingUIStore();
  const { strategies, loadStrategies } = useStrategyStore();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => tradeSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TradeFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(selectedTrade ?? blankValues);
    setSubmitError(null);
  }, [selectedTrade, reset]);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  async function onSubmit(data: TradeFormData) {
    setSubmitError(null);
    const isEditing = selectedTrade?.id !== undefined;

    // Status is derived, not manually selected: a trade is "closed" once an
    // exit price has been recorded, "open" otherwise. Defaults the exit date
    // to today if the user filled in an exit price but skipped the date.
    const isClosed = Boolean(data.exitPrice);
    const payload: TradeFormData = {
      ...data,
      status: isClosed ? "closed" : "open",
      exitDate: isClosed ? (data.exitDate || toLocalDateString(new Date())) : data.exitDate,
    };

    try {
      if (selectedTrade?.id !== undefined) {
        await updateTrade(selectedTrade.id, payload);
      } else {
        await addTrade(payload);
      }

      reset(blankValues);
      closeTradeDrawer();
      toast.success(isEditing ? t("trading.updatedSuccess") : t("trading.savedSuccess"));
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
        {selectedTrade ? t("trading.editTrade") : t("trading.createTrade")}
      </h2>

      <TradeCoreFields register={register} watch={watch} setValue={setValue} errors={errors} />
      <TradeRiskFields register={register} />
      <TradeRiskCalculator watch={watch} setValue={setValue} />
      <TradeMetaFields control={control} register={register} strategyNames={strategies.map((s) => s.name)} />
      <TradePsychologyFields register={register} />

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("trading.saving") : t("common.save")}
      </button>
    </form>
  );
}
