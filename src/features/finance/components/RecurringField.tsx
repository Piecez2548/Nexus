import { Controller, type Control } from "react-hook-form";
import type { TransactionFormData } from "@/features/finance/schemas/transactionSchema";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "รายวัน",
  weekly: "รายสัปดาห์",
  monthly: "รายเดือน",
  yearly: "รายปี",
};

interface Props {
  control: Control<TransactionFormData>;
}

export default function RecurringField({ control }: Props) {
  return (
    <Controller
      name="recurring"
      control={control}
      render={({ field }) => (
        <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={field.value != null}
              onChange={(e) =>
                field.onChange(e.target.checked ? { frequency: "monthly" } : null)
              }
            />
            รายการที่เกิดซ้ำ
          </label>

          {field.value != null && (
            <select
              value={field.value.frequency}
              onChange={(e) => field.onChange({ frequency: e.target.value })}
              className={inputClassName}
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    />
  );
}
