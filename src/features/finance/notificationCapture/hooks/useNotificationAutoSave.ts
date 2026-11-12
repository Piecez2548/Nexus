import { useEffect, useMemo, useRef, useState } from "react";

import { defaultSmartImportDeps } from "@/features/finance/slipScanner/import/smartImportDeps";
import { rollbackImport } from "@/features/finance/slipScanner/import/smartImport";
import { useSmartImport } from "@/features/finance/slipScanner/hooks/useSmartImport";
import { useCategoryLearningStore } from "@/features/finance/slipScanner/store/categoryLearningStore";
import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { translate } from "@/i18n/useTranslation";
import { useToastStore } from "@/store/toastStore";

import { isHighConfidenceNotification } from "../engine/autoSavePolicy";
import { useNotificationAutoSaveStore } from "../store/notificationAutoSaveStore";

// Saves high-confidence notification candidates through the same Smart Import
// path as the manual Confirm tap (duplicate guard and import history
// included), then tells the person with an Undo action. Returns only the
// candidates that still need the confirm sheet. Does nothing unless the
// opt-in setting is on; a failed save leaves the candidate for manual confirm.
export function useNotificationAutoSave(
  candidates: SlipCandidate[],
  acknowledge: (candidateId: string) => Promise<void>,
): SlipCandidate[] {
  const enabled = useNotificationAutoSaveStore((s) => s.enabled);
  const corrections = useCategoryLearningStore((s) => s.corrections);
  const { importCandidates } = useSmartImport();
  const inFlight = useRef(new Set<string>());
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());

  const learned = useMemo(() => new Map(Object.entries(corrections)), [corrections]);
  const eligible = useMemo(
    () => (enabled ? candidates.filter((c) => !failedIds.has(c.id) && isHighConfidenceNotification(c, learned)) : []),
    [enabled, candidates, learned, failedIds],
  );

  useEffect(() => {
    for (const candidate of eligible) {
      if (inFlight.current.has(candidate.id)) continue;
      inFlight.current.add(candidate.id);
      void (async () => {
        try {
          const categories = useCategoryStore.getState().categories;
          const result = await importCandidates(
            [candidate],
            {
              learnedCategories: learned,
              validCategoryNames: categories.length > 0 ? new Set(categories.map((c) => c.name)) : undefined,
            },
            "notification",
          );
          // Not created and not a known duplicate -> let the person decide.
          if (result.importedIds.length === 0 && result.skippedDuplicates.length === 0) throw new Error("not imported");
          await acknowledge(candidate.id);
          if (result.importedIds.length > 0) {
            useToastStore.getState().show(
              "success",
              translate("slipScanner.notificationCapture.autoSaved", {
                amount: candidate.amount?.toLocaleString() ?? "",
                name: candidate.merchant ?? "",
              }),
              {
                durationMs: 8000,
                action: {
                  label: translate("slipScanner.notificationCapture.undo"),
                  onClick: () => {
                    void rollbackImport(result.importedIds, defaultSmartImportDeps).then(() =>
                      useTransactionStore.getState().loadTransactions(),
                    );
                  },
                },
              },
            );
          }
        } catch {
          // Fall back to the manual confirm sheet for this candidate.
          setFailedIds((prev) => new Set(prev).add(candidate.id));
        } finally {
          inFlight.current.delete(candidate.id);
        }
      })();
    }
    // importCandidates/acknowledge identities change per render; `eligible` is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  return useMemo(() => {
    const autoIds = new Set(eligible.map((c) => c.id));
    return candidates.filter((c) => !autoIds.has(c.id));
  }, [candidates, eligible]);
}
