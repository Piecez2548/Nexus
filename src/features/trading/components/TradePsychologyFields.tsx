import type { UseFormRegister } from "react-hook-form";
import type { TradeFormData } from "@/features/trading/schemas/tradeSchema";
import { EMOTION_LABELS } from "@/features/trading/constants/labels";
import { numberOrUndefined } from "@/utils/numberField";
import { emptyToUndefined } from "@/utils/selectField";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  register: UseFormRegister<TradeFormData>;
}

export default function TradePsychologyFields({ register }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t("trading.psychologyTitle")}</h3>

      <p className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-500">{t("trading.beforeTrade")}</p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.emotionLabel")} htmlFor="trade-emotion-before">
          <select
            id="trade-emotion-before"
            {...register("emotionBefore", { setValueAs: emptyToUndefined })}
            className={inputClassName}
          >
            <option value="">—</option>
            {Object.entries(EMOTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("trading.confidenceLabel")} htmlFor="trade-confidence-before">
          <input
            id="trade-confidence-before"
            type="number"
            min={1}
            max={5}
            {...register("confidenceBefore", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <p className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-500">{t("trading.afterTrade")}</p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label={t("trading.emotionLabel")} htmlFor="trade-emotion-after">
          <select
            id="trade-emotion-after"
            {...register("emotionAfter", { setValueAs: emptyToUndefined })}
            className={inputClassName}
          >
            <option value="">—</option>
            {Object.entries(EMOTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("trading.confidenceLabel")} htmlFor="trade-confidence-after">
          <input
            id="trade-confidence-after"
            type="number"
            min={1}
            max={5}
            {...register("confidenceAfter", { setValueAs: numberOrUndefined })}
            className={inputClassName}
          />
        </FormField>
      </div>

      <FormField label={t("trading.mistakesLabel")} htmlFor="trade-mistakes">
        <textarea
          id="trade-mistakes"
          {...register("mistakes")}
          rows={2}
          placeholder={t("trading.mistakesPlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("trading.lessonsLabel")} htmlFor="trade-lessons">
        <textarea
          id="trade-lessons"
          {...register("lessonsLearned")}
          rows={2}
          placeholder={t("trading.lessonsPlaceholder")}
          className={inputClassName}
        />
      </FormField>
    </div>
  );
}
