import { useEffect, useMemo, useState } from "react";

import Drawer from "@/components/ui/Drawer";
import { categorize } from "@/features/finance/slipScanner/ai/transactionCategorizer";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

import { usePendingNotificationCandidates } from "../hooks/usePendingNotificationCandidates";

// Mounted once at the app shell (MainLayout.tsx), same as ScanRecoveryNotice.
// The one-tap "Confirm" surface for Payment Notification Capture -- NOT the
// full ImportPreview drawer (built for multi-candidate batch review with
// search/filter/per-row edit; real overkill for "one payment, tap to
// confirm"). Shows the oldest pending candidate at a time; Confirm hands a
// (possibly title/category-edited) copy to the same Smart Import pipeline
// every other import path uses -- the actual Dexie write only ever happens
// from that explicit tap.
export default function PendingPaymentSheet() {
  const { candidates, acknowledge } = usePendingNotificationCandidates();
  const { importCandidates } = useSmartImport();
  const allCategories = useCategoryStore((s) => s.categories);
  const toast = useToast();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const candidate = candidates[0];

  // Defaults to exactly what candidateToTransaction would use anyway
  // (merchant, else bank name) -- editing this is optional, not required.
  const defaultTitle = candidate?.merchant?.trim() || candidate?.bankName?.trim() || "";
  const [title, setTitle] = useState(defaultTitle);

  // A bank notification can equally be an outgoing payment or incoming
  // money -- unlike a scanned slip, which is always outgoing (see
  // candidateToTransaction.ts). Defaults to "expense" (this sheet's own
  // framing, "Payment detected") but is always overridable.
  const [type, setType] = useState<"income" | "expense">("expense");
  const categories = allCategories.filter((c) => c.type === type);

  // Only set once the user actually taps a chip -- left unset (undefined),
  // the normal auto-categorize()-then-resolve logic in
  // candidateToTransaction.ts runs exactly as it always has. guessedCategory
  // below is purely for which chip to highlight as the suggestion; it never
  // overrides anything by itself.
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  // Reset local edits whenever the sheet moves on to a new candidate.
  useEffect(() => {
    setTitle(defaultTitle);
    setType("expense");
    setSelectedCategory(undefined);
    // defaultTitle is derived from candidate -- re-running this effect when
    // candidate?.id changes is the actual intent (a new candidate to edit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id]);

  // A category chip picked under one type is almost never valid under the
  // other (the chip list itself switches to the other type's categories) --
  // clearing it here avoids sending a stale expense category name alongside
  // a now-income transaction, or vice versa.
  function handleTypeChange(next: "income" | "expense") {
    setType(next);
    setSelectedCategory(undefined);
  }

  // The categorizer's keyword rules are expense-oriented -- for an income
  // candidate its guess would highlight an expense-shaped category name that
  // doesn't even appear in this income-filtered chip list (see
  // candidateToTransaction.ts, which applies the same restriction to the
  // actual import).
  const guessedCategory = useMemo(() => {
    if (type !== "expense" || !title.trim()) return undefined;
    return categorize(title).category;
  }, [title, type]);

  async function handleConfirm(): Promise<void> {
    if (!candidate) return;
    setBusy(true);
    try {
      const edited = {
        ...candidate,
        merchant: title.trim() || candidate.merchant,
        category: selectedCategory,
        type,
      };
      await importCandidates([edited], {}, "notification");
      await acknowledge(candidate.id);
      toast.success(t("slipScanner.notificationCapture.confirmed"));
    } catch {
      toast.error(t("slipScanner.notificationCapture.confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDismiss(): Promise<void> {
    if (!candidate) return;
    await acknowledge(candidate.id);
  }

  return (
    <Drawer open={!!candidate} onClose={() => void handleDismiss()}>
      {candidate && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t("slipScanner.notificationCapture.title")}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.notificationCapture.subtitle")}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.notificationCapture.bank")}</span>
              <span className="font-medium">{candidate.bankName ?? t("slipScanner.importPreview.unknownBank")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.notificationCapture.amount")}</span>
              <span className="text-xl font-semibold">฿{candidate.amount?.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">
              {t("slipScanner.notificationCapture.typeLabel")}
            </span>
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((option) => {
                const active = type === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleTypeChange(option)}
                    aria-pressed={active}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400"
                        : "border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
                    }`}
                  >
                    {t(`transactions.${option}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block text-sm text-zinc-500 dark:text-zinc-400">
            {t("slipScanner.notificationCapture.nameLabel")}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={candidate.bankName ?? ""}
              className="mt-1 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-base text-zinc-900 dark:text-white outline-none focus:border-brand-500"
            />
          </label>

          {categories.length > 0 && (
            <div>
              <span className="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">
                {t("slipScanner.notificationCapture.categoryLabel")}
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = (selectedCategory ?? guessedCategory) === c.name;
                  return (
                    <button
                      key={c.id ?? c.name}
                      type="button"
                      onClick={() => setSelectedCategory(c.name)}
                      aria-pressed={active}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "border-brand-500 bg-brand-500/15 text-brand-600 dark:text-brand-400"
                          : "border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleDismiss()}
              disabled={busy}
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              {t("slipScanner.notificationCapture.dismiss")}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {t("slipScanner.notificationCapture.confirm")}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
