import { useEffect, useState } from "react";
import type { UseFormWatch, UseFormSetValue } from "react-hook-form";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

const ACCOUNT_BALANCE_KEY = "nexus-trading-account-balance";

interface Props {
  watch: UseFormWatch<TradeFormData>;
  setValue: UseFormSetValue<TradeFormData>;
}

export default function TradeRiskCalculator({ watch, setValue }: Props) {
  const [accountBalance, setAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem(ACCOUNT_BALANCE_KEY);
    return saved ? Number(saved) : 0;
  });

  const entryPrice = watch("entryPrice");
  const stopLoss = watch("stopLoss");
  const riskPercent = watch("riskPercent");

  useEffect(() => {
    localStorage.setItem(ACCOUNT_BALANCE_KEY, String(accountBalance));
  }, [accountBalance]);

  const stopDistance = entryPrice && stopLoss ? Math.abs(entryPrice - stopLoss) : 0;
  const riskAmount = accountBalance > 0 && riskPercent ? accountBalance * (riskPercent / 100) : 0;
  const positionSize = stopDistance > 0 && riskAmount > 0 ? riskAmount / stopDistance : 0;
  const canCalculate = positionSize > 0;

  function applyCalculated() {
    if (!canCalculate) return;
    const rounded = Number(positionSize.toFixed(4));
    setValue("quantity", rounded);
    setValue("positionSize", rounded);
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Risk Calculator (AI คำนวณอัตโนมัติ)
      </h3>

      <FormField label="Account Balance" htmlFor="calc-account-balance">
        <input
          id="calc-account-balance"
          type="number"
          step="any"
          value={accountBalance || ""}
          onChange={(e) => setAccountBalance(Number(e.target.value) || 0)}
          placeholder="เช่น 10000"
          className={inputClassName}
        />
      </FormField>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Lot Size</p>
          <p className="font-semibold">{canCalculate ? positionSize.toFixed(4) : "-"}</p>
        </div>

        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Position Size</p>
          <p className="font-semibold">{canCalculate ? positionSize.toFixed(4) : "-"}</p>
        </div>

        <div>
          <p className="text-zinc-500 dark:text-zinc-400">Maximum Loss</p>
          <p className="font-semibold text-red-400">
            {riskAmount > 0 ? riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"}
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        คำนวณจาก Account Balance, Risk % (ในหมวด Risk Management ด้านล่าง), ราคาเข้า และ Stop Loss
      </p>

      <button
        type="button"
        onClick={applyCalculated}
        disabled={!canCalculate}
        className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 py-2 text-sm font-medium transition hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        นำไปใช้กับ Lot Size
      </button>
    </div>
  );
}
