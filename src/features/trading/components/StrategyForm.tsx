import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { strategySchema, type StrategyFormData } from "@/features/trading/schemas/strategySchema";
import { useStrategyStore } from "@/features/trading/store/strategyStore";
import { getMarketLabels } from "@/features/trading/constants/labels";
import { emptyToUndefined } from "@/utils/selectField";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import TagsInput from "@/components/ui/TagsInput";
import { useTranslation } from "@/i18n/useTranslation";
import type { Strategy } from "@/features/trading/types";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

const blankValues: StrategyFormData = {
  name: "",
  description: "",
  market: undefined,
  entryRules: "",
  exitRules: "",
  riskManagementNotes: "",
  tags: [],
};

interface Props {
  strategy: Strategy | null;
  onDone: () => void;
}

export default function StrategyForm({ strategy, onDone }: Props) {
  const { addStrategy, updateStrategy } = useStrategyStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useTranslation();
  const schema = useMemo(() => strategySchema(t), [t]);
  const marketLabels = getMarketLabels(t);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<StrategyFormData>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
  });

  useEffect(() => {
    reset(strategy ?? blankValues);
    setSubmitError(null);
  }, [strategy, reset]);

  async function onSubmit(data: StrategyFormData) {
    setSubmitError(null);
    const isEditing = strategy?.id !== undefined;
    const payload: Strategy = {
      name: data.name,
      description: data.description || undefined,
      market: data.market,
      entryRules: data.entryRules || undefined,
      exitRules: data.exitRules || undefined,
      riskManagementNotes: data.riskManagementNotes || undefined,
      tags: data.tags,
    };

    try {
      if (strategy?.id !== undefined) {
        await updateStrategy(strategy.id, payload);
      } else {
        await addStrategy(payload);
      }

      onDone();
      toast.success(isEditing ? t("strategies.updatedSuccess") : t("strategies.savedSuccess"));
    } catch (err) {
      const message = toErrorMessage(err);
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-bold">
        {strategy ? t("strategies.editStrategy") : t("strategies.addStrategy")}
      </h2>

      <FormField label={t("strategies.nameLabel")} htmlFor="strategy-name" error={errors.name?.message}>
        <input
          id="strategy-name"
          {...register("name")}
          placeholder={t("strategies.namePlaceholder")}
          className={inputClassName}
        />
      </FormField>

      <FormField label={t("strategies.descriptionLabel")} htmlFor="strategy-description">
        <textarea id="strategy-description" {...register("description")} rows={2} className={inputClassName} />
      </FormField>

      <FormField label={t("trading.market")} htmlFor="strategy-market">
        <select id="strategy-market" {...register("market", { setValueAs: emptyToUndefined })} className={inputClassName}>
          <option value="">—</option>
          {Object.entries(marketLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("strategies.entryRulesLabel")} htmlFor="strategy-entry-rules">
        <textarea id="strategy-entry-rules" {...register("entryRules")} rows={3} className={inputClassName} />
      </FormField>

      <FormField label={t("strategies.exitRulesLabel")} htmlFor="strategy-exit-rules">
        <textarea id="strategy-exit-rules" {...register("exitRules")} rows={3} className={inputClassName} />
      </FormField>

      <FormField label={t("strategies.riskManagementNotesLabel")} htmlFor="strategy-risk-notes">
        <textarea id="strategy-risk-notes" {...register("riskManagementNotes")} rows={3} className={inputClassName} />
      </FormField>

      <FormField label={t("trading.tagsLabel")} htmlFor="strategy-tags">
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagsInput
              id="strategy-tags"
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder={t("trading.tagsPlaceholder")}
            />
          )}
        />
      </FormField>

      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-zinc-900 dark:text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? t("strategies.saving") : t("common.save")}
      </button>
    </form>
  );
}
