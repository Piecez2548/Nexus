import { Controller, type Control, type UseFormRegister } from "react-hook-form";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";
import { SESSION_LABELS } from "@/features/trading/constants/labels";
import { emptyToUndefined } from "@/utils/selectField";
import FormField from "@/components/ui/FormField";
import TagsInput from "@/components/ui/TagsInput";
import MultiFileField from "@/components/ui/MultiFileField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

interface Props {
  control: Control<TradeFormData>;
  register: UseFormRegister<TradeFormData>;
}

export default function TradeMetaFields({ control, register }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Strategy" htmlFor="trade-strategy">
          <input
            id="trade-strategy"
            {...register("strategy")}
            placeholder="เช่น Breakout, Pullback"
            className={inputClassName}
          />
        </FormField>

        <FormField label="Setup" htmlFor="trade-setup">
          <input
            id="trade-setup"
            {...register("setup")}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField label="Session" htmlFor="trade-session">
        <select
          id="trade-session"
          {...register("session", { setValueAs: emptyToUndefined })}
          className={inputClassName}
        >
          <option value="">—</option>
          {Object.entries(SESSION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="แท็ก" htmlFor="trade-tags">
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagsInput
              id="trade-tags"
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="เช่น breakout, high-conviction"
            />
          )}
        />
      </FormField>

      <FormField label="Screenshots" htmlFor="trade-screenshots">
        <Controller
          name="screenshots"
          control={control}
          render={({ field }) => (
            <MultiFileField
              id="trade-screenshots"
              values={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label="Notes" htmlFor="trade-notes">
        <textarea
          id="trade-notes"
          {...register("notes")}
          rows={3}
          placeholder="รายละเอียดเพิ่มเติม"
          className={inputClassName}
        />
      </FormField>
    </>
  );
}
