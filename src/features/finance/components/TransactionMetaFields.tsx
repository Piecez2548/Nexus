import type { UseFormRegister } from "react-hook-form";
import type { TransactionFormData } from "@/features/finance/schemas/transactionSchema";

import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  register: UseFormRegister<TransactionFormData>;
}

export default function TransactionMetaFields({ register }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <FormField label={t("transactions.note")} htmlFor="transaction-note">
        <textarea
          id="transaction-note"
          {...register("note")}
          rows={3}
          placeholder={t("transactions.notePlaceholder")}
          className={inputClassName}
        />
      </FormField>
    </>
  );
}
