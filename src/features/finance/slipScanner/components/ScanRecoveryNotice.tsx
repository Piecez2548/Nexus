import { useEffect, useRef } from "react";

import { detectRecovery, planRecovery, type RecoveryAction } from "@/features/finance/slipScanner/recovery/recoverySystem";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/i18n/useTranslation";

// Mounted once at the app shell (Recovery System, GS-037): on startup, checks
// for a scan session left running/paused by a killed app, or a Smart Import
// that ended partial/failed, and surfaces a notice for either. Detection and
// planning already existed and were fully tested but never called from
// anywhere — this is the missing call site. Informational only for now: a
// "resume scan" action needs the scan orchestrator wired to a live UI trigger
// (a later step) before there is anything to resume into; the import-history
// half is actionable today (Settings > Import History has the detail).
export default function ScanRecoveryNotice() {
  const toast = useToast();
  const { t } = useTranslation();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return; // guard against StrictMode's double-invoked effect
    checked.current = true;

    void (async () => {
      const state = await detectRecovery();
      const actions = planRecovery(state);

      for (const action of actions) {
        if (action.kind === "none") continue;
        const message = describe(action, t);
        if (message) toast.info(message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only
  }, []);

  return null;
}

function describe(action: RecoveryAction, t: ReturnType<typeof useTranslation>["t"]): string | null {
  switch (action.kind) {
    case "resume-scan":
      return t("slipScanner.recovery.resumableScan");
    case "retry-import":
      return t("slipScanner.recovery.lastImportFailed");
    default:
      return null;
  }
}
