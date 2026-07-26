import type { UseFormRegister } from "react-hook-form";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";
import { numberOrUndefined } from "@/utils/numberField";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  register: UseFormRegister<TradeFormData>;
}

export default function TradeRiskFields({ register }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Risk Management</h3>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Stop Loss" htmlFor="trade-stop-loss">
          <input
            id="trade-stop-loss"
            type="number"
            step="any"
            {...register("stopLoss", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Take Profit" htmlFor="trade-take-profit">
          <input
            id="trade-take-profit"
            type="number"
            step="any"
            {...register("takeProfit", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Risk %" htmlFor="trade-risk-percent">
          <input
            id="trade-risk-percent"
            type="number"
            step="any"
            {...register("riskPercent", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Position Size" htmlFor="trade-position-size">
          <input
            id="trade-position-size"
            type="number"
            step="any"
            {...register("positionSize", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Commission" htmlFor="trade-commission">
          <input
            id="trade-commission"
            type="number"
            step="any"
            {...register("commission", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Swap" htmlFor="trade-swap">
          <input
            id="trade-swap"
            type="number"
            step="any"
            {...register("swap", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Slippage" htmlFor="trade-slippage">
          <input
            id="trade-slippage"
            type="number"
            step="any"
            {...register("slippage", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>
    </div>
  );
}
