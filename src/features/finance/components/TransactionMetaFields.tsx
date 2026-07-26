import type { UseFormRegister } from "react-hook-form";
import type { TransactionFormData } from "@/features/finance/schemas/transactionSchema";

import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

interface Props {
  register: UseFormRegister<TransactionFormData>;
}

export default function TransactionMetaFields({ register }: Props) {
  return (
    <>
      <FormField label="หมายเหตุ" htmlFor="transaction-note">
        <textarea
          id="transaction-note"
          {...register("note")}
          rows={3}
          placeholder="รายละเอียดเพิ่มเติม"
          className={inputClassName}
        />
      </FormField>
    </>
  );
}
