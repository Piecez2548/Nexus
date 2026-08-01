import { useEffect } from "react";
import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";
import { MARKET_LABELS, DIRECTION_LABELS } from "@/features/trading/constants/labels";
import { detectMarketFromSymbol } from "@/features/trading/utils/marketDetection";
import { numberOrUndefined } from "@/utils/numberField";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  register: UseFormRegister<TradeFormData>;
  watch: UseFormWatch<TradeFormData>;
  setValue: UseFormSetValue<TradeFormData>;
  errors: FieldErrors<TradeFormData>;
}

export default function TradeCoreFields({ register, watch, setValue, errors }: Props) {
  const { t } = useTranslation();
  const symbol = watch("symbol");

  // AI-assisted market detection: pattern-matches the symbol against known
  // broker conventions (e.g. XAUUSD -> CFD, EURUSD -> Forex) instead of
  // requiring the user to pick the market manually. Still fully editable —
  // this only pre-fills the dropdown.
  useEffect(() => {
    const detected = detectMarketFromSymbol(symbol ?? "");
    if (detected) setValue("market", detected);
  }, [symbol, setValue]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.symbol")} htmlFor="trade-symbol" error={errors.symbol?.message}>
          <input
            id="trade-symbol"
            {...register("symbol")}
            placeholder={t("trading.symbolPlaceholder")}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("trading.marketLabel")} htmlFor="trade-market">
          <select id="trade-market" {...register("market")} className={inputClassName}>
            {Object.entries(MARKET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label={t("trading.direction")} htmlFor="trade-direction">
        <select id="trade-direction" {...register("direction")} className={inputClassName}>
          {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.entryPriceLabel")} htmlFor="trade-entry-price" error={errors.entryPrice?.message}>
          <input
            id="trade-entry-price"
            type="number"
            step="any"
            {...register("entryPrice", { valueAsNumber: true })}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("trading.lotSizeLabel")} htmlFor="trade-quantity" error={errors.quantity?.message}>
          <input
            id="trade-quantity"
            type="number"
            step="any"
            {...register("quantity", { valueAsNumber: true })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.entryDateLabel")} htmlFor="trade-entry-date" error={errors.entryDate?.message}>
          <input
            id="trade-entry-date"
            type="date"
            {...register("entryDate")}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("trading.entryTimeLabel")} htmlFor="trade-entry-time">
          <input
            id="trade-entry-time"
            type="time"
            {...register("entryTime")}
            className={inputClassName}
          />
        </FormField>
      </div>

      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {t("trading.closePositionNote")}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.exitPriceLabel")} htmlFor="trade-exit-price" error={errors.exitPrice?.message}>
          <input
            id="trade-exit-price"
            type="number"
            step="any"
            {...register("exitPrice", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label={t("trading.exitDateLabel")} htmlFor="trade-exit-date" error={errors.exitDate?.message}>
          <input
            id="trade-exit-date"
            type="date"
            {...register("exitDate")}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField label={t("trading.exitTimeLabel")} htmlFor="trade-exit-time">
        <input
          id="trade-exit-time"
          type="time"
          {...register("exitTime")}
          className={inputClassName}
        />
      </FormField>
    </>
  );
}
