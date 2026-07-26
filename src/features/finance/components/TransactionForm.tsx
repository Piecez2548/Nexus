import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";

import {
  transactionSchema,
  type TransactionFormData,
} from "@/features/finance/schemas/transactionSchema";

import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useAccountStore } from "@/features/finance/store/accountStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useUIStore } from "@/features/finance/store/uiStore";
import { recipientProfileService } from "@/features/finance/services/recipientProfileService";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";

import FormField from "@/components/ui/FormField";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import TransactionMetaFields from "@/features/finance/components/TransactionMetaFields";
import RecurringField from "@/features/finance/components/RecurringField";
import RecipientSuggestionField from "@/features/finance/components/RecipientSuggestionField";
import { useTranslation } from "@/i18n/useTranslation";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const TYPE_LABEL_KEYS: Record<TransactionFormData["type"], string> = {
  expense: "transactions.expense",
  income: "transactions.income",
  transfer: "transactions.transfer",
  refund: "transactions.refund",
  adjustment: "transactions.adjustment",
};

const blankValues: TransactionFormData = {
  title: "",
  amount: 0,
  type: "expense",
  category: "",
  account: "Cash",
  toAccount: "",
  date: new Date().toISOString().slice(0, 10),
  time: "",
  tags: [],
  attachment: undefined,
  note: "",
  recipient: "",
  status: "completed",
  recurring: null,
};

export default function TransactionForm() {
  const { addTransaction, updateTransaction } = useTransactionStore();

  const {
    selectedTransaction,
    draftTransaction,
    closeTransactionDrawer,
  } = useUIStore();

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    loadAccounts,
  } = useAccountStore();

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    loadCategories,
  } = useCategoryStore();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, [loadAccounts, loadCategories]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(selectedTransaction ?? { ...blankValues, ...draftTransaction });
    setSubmitError(null);
  }, [selectedTransaction, draftTransaction, reset]);

  const type = watch("type");
  const needsCategory = type === "income" || type === "expense";
  const isTransfer = type === "transfer";

  async function onSubmit(data: TransactionFormData) {
    setSubmitError(null);
    const isEditing = selectedTransaction?.id !== undefined;

    try {
      if (selectedTransaction?.id !== undefined) {
        await updateTransaction(selectedTransaction.id, data);
      } else {
        await addTransaction(data);
      }

      if (data.recipient && data.category) {
        // Learning Engine: remember this recipient's category so the Rule
        // Engine can auto-apply it next time. Best-effort — a failure here
        // shouldn't block the transaction that already saved successfully.
        recipientProfileService
          .recordUsage({
            recipientKey: data.recipient,
            alias: data.title,
            category: data.category,
            account: data.account,
            amount: data.amount,
            date: data.date,
          })
          .catch(() => {});
      }

      reset(blankValues);
      closeTransactionDrawer();
      toast.success(isEditing ? t("transactions.updatedSuccess") : t("transactions.savedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (accountsLoading || categoriesLoading) {
    return <LoadingState label={t("transactions.loadingData")} />;
  }

  if (accountsError || categoriesError) {
    return (
      <ErrorState
        message={accountsError ?? categoriesError ?? t("transactions.loadFailed")}
        onRetry={() => {
          loadAccounts();
          loadCategories();
        }}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">
        {selectedTransaction ? t("transactions.editTransaction") : t("transactions.addTransaction")}
      </h2>

      <FormField label="ประเภท" htmlFor="transaction-type">
        <select id="transaction-type" {...register("type")} className={inputClassName}>
          {Object.entries(TYPE_LABEL_KEYS).map(([value, labelKey]) => (
            <option key={value} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="ชื่อรายการ" htmlFor="transaction-title" error={errors.title?.message}>
        <input
          id="transaction-title"
          {...register("title")}
          placeholder="เช่น KFC, เงินเดือน"
          className={inputClassName}
        />
      </FormField>

      <FormField label="จำนวนเงิน" htmlFor="transaction-amount" error={errors.amount?.message}>
        <input
          id="transaction-amount"
          type="number"
          {...register("amount", {
            valueAsNumber: true,
          })}
          placeholder="0"
          className={inputClassName}
        />
      </FormField>

      {needsCategory && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-sm text-brand-500"
          >
            <ChevronDown size={16} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            เพิ่มเติม
          </button>

          <div className={showAdvanced ? "mt-3" : undefined}>
            <RecipientSuggestionField register={register} watch={watch} setValue={setValue} showInput={showAdvanced} />
          </div>
        </div>
      )}

      {needsCategory && (
        <FormField label="หมวดหมู่" htmlFor="transaction-category" error={errors.category?.message}>
          <select id="transaction-category" {...register("category")} className={inputClassName}>
            <option value="">เลือกหมวดหมู่</option>

            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label={isTransfer ? "บัญชีต้นทาง" : "บัญชี"} htmlFor="transaction-account">
        <select id="transaction-account" {...register("account")} className={inputClassName}>
          <option value="">เลือกบัญชี</option>

          {accounts.map((account) => (
            <option key={account.id} value={account.name}>
              {account.name}
            </option>
          ))}
        </select>
      </FormField>

      {isTransfer && (
        <FormField label="บัญชีปลายทาง" htmlFor="transaction-to-account" error={errors.toAccount?.message}>
          <select id="transaction-to-account" {...register("toAccount")} className={inputClassName}>
            <option value="">เลือกบัญชีปลายทาง</option>

            {accounts.map((account) => (
              <option key={account.id} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="วันที่" htmlFor="transaction-date">
          <input
            id="transaction-date"
            type="date"
            {...register("date")}
            className={inputClassName}
          />
        </FormField>

        <FormField label="เวลา" htmlFor="transaction-time">
          <input
            id="transaction-time"
            type="time"
            {...register("time")}
            className={inputClassName}
          />
        </FormField>
      </div>

      <TransactionMetaFields register={register} />

      <RecurringField control={control} />

      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
