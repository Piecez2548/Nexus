import { useState } from "react";

import Drawer from "@/components/ui/Drawer";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

import { usePendingNotificationCandidates } from "../hooks/usePendingNotificationCandidates";

// Mounted once at the app shell (MainLayout.tsx), same as ScanRecoveryNotice.
// The one-tap "Confirm" surface for Payment Notification Capture -- NOT the
// full ImportPreview drawer (built for multi-candidate batch review with
// search/filter/per-row edit; real overkill for "one payment, tap to
// confirm"). Shows the oldest pending candidate at a time; Confirm hands it,
// unmodified, to the same Smart Import pipeline every other import path
// uses -- the actual Dexie write only ever happens from that explicit tap.
export default function PendingPaymentSheet() {
  const { candidates, acknowledge } = usePendingNotificationCandidates();
  const { importCandidates } = useSmartImport();
  const toast = useToast();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const candidate = candidates[0];

  async function handleConfirm(): Promise<void> {
    if (!candidate) return;
    setBusy(true);
    try {
      await importCandidates([candidate], {}, "notification");
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
            {candidate.merchant && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("slipScanner.notificationCapture.merchant")}</span>
                <span className="font-medium">{candidate.merchant}</span>
              </div>
            )}
          </div>

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
