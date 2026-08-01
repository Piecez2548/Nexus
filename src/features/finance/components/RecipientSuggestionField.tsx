import { useEffect, useRef, useState } from "react";
import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";

import type { TransactionFormData } from "@/features/finance/schemas/transactionSchema";
import {
  categorySuggestionService,
  type CategorySuggestion,
} from "@/features/finance/services/categorySuggestionService";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  register: UseFormRegister<TransactionFormData>;
  watch: UseFormWatch<TransactionFormData>;
  setValue: UseFormSetValue<TransactionFormData>;
  // Only the recipient input itself is tucked under the form's "More"
  // disclosure — the suggestion effect below must keep running regardless,
  // so a title-only merchant match (no recipient needed) keeps working
  // without the user ever having to expand it.
  showInput: boolean;
}

// Rule Engine, wired into the form: as the user types a recipient (or a
// title matching a known merchant), suggest — and pre-fill — a category
// learned from past transactions, instead of asking every time.
export default function RecipientSuggestionField({ register, watch, setValue, showInput }: Props) {
  const { t } = useTranslation();
  const recipient = watch("recipient");
  const title = watch("title");
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const lastLookupKey = useRef<string | null>(null);

  useEffect(() => {
    const lookupKey = `${recipient ?? ""}|${title ?? ""}`;
    if (lookupKey === "|") return;
    if (lastLookupKey.current === lookupKey) return;

    let cancelled = false;

    const handle = setTimeout(async () => {
      const result = await categorySuggestionService.suggest(recipient || undefined, title ?? "");
      if (cancelled) return;

      lastLookupKey.current = lookupKey;
      setSuggestion(result);

      if (result) {
        setValue("category", result.category, { shouldValidate: true });
        if (result.account) {
          setValue("account", result.account, { shouldValidate: true });
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [recipient, title, setValue]);

  return (
    <>
      {showInput && (
        <FormField label={t("transactions.recipientLabel")} htmlFor="transaction-recipient">
          <input
            id="transaction-recipient"
            {...register("recipient")}
            placeholder={t("transactions.recipientPlaceholder")}
            className={inputClassName}
          />
        </FormField>
      )}

      {suggestion && (
        <p className="text-xs text-brand-400">
          {suggestion.source === "recipient"
            ? t("transactions.suggestionFromRecipientHistory", {
                category: suggestion.category,
                label: suggestion.label,
                confidence: suggestion.confidence,
              })
            : t("transactions.suggestionFromMerchantDb", { category: suggestion.category, label: suggestion.label })}
        </p>
      )}
    </>
  );
}
