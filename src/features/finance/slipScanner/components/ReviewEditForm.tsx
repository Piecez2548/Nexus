import { useState } from "react";

import { isSlipCategory } from "@/features/finance/slipScanner/ai/transactionCategorizer";
import type { CandidateEdit } from "@/features/finance/slipScanner/hooks/useImportPreview";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  candidate: SlipCandidate;
  onSave: (patch: CandidateEdit) => void;
  onCancel: () => void;
}

// The Review Queue's inline correction form (Slip Intelligence Section 18):
// amount, merchant and category, editable per candidate before import. Saving
// a changed category also records it as a learned correction (GS-045) — this
// is the missing write side of that store: it already existed and was read
// at import time, but nothing ever called learn() until this form. Recording
// happens only on an explicit save, which is exactly the "under user control"
// requirement — no separate confirmation step needed on top of that.
export default function ReviewEditForm({ candidate, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const categories = useCategoryStore((s) => s.categories).filter((c) => c.type === "expense");

  const [amount, setAmount] = useState(candidate.amount !== undefined ? String(candidate.amount) : "");
  const [merchant, setMerchant] = useState(candidate.merchant ?? "");
  const [category, setCategory] = useState(candidate.category ?? "");

  function handleSave(): void {
    const parsedAmount = Number(amount);
    const trimmedMerchant = merchant.trim();
    const trimmedCategory = category.trim();

    // The learning store only understands the fixed keyword-based categories
    // (SlipCategory), not the user's free-form category list — skip learning
    // when the picked category is one of the user's own (e.g. "Gym"), since
    // there's nothing meaningful to feed back into categorize()'s guesser.
    if (trimmedCategory && isSlipCategory(trimmedCategory) && trimmedCategory !== candidate.category) {
      const learnKey = trimmedMerchant || candidate.bankName?.trim();
      if (learnKey) useCategoryLearningStore.getState().learn(learnKey, trimmedCategory);
    }

    onSave({
      amount: amount.trim() !== "" && Number.isFinite(parsedAmount) ? parsedAmount : candidate.amount,
      merchant: trimmedMerchant || undefined,
      category: trimmedCategory || undefined,
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-300 bg-brand-50/40 p-3 dark:border-brand-700 dark:bg-brand-950/20">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-zinc-500 dark:text-zinc-400">
          {t("slipScanner.importPreview.editAmount")}
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </label>
        <label className="block text-xs text-zinc-500 dark:text-zinc-400">
          {t("slipScanner.importPreview.editMerchant")}
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </label>
      </div>

      <label className="block text-xs text-zinc-500 dark:text-zinc-400">
        {t("slipScanner.importPreview.editCategory")}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="">{t("slipScanner.importPreview.editCategoryAuto")}</option>
          {categories.map((c) => (
            <option key={c.id ?? c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
