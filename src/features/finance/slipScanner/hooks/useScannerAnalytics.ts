import { useMemo } from "react";

import { deriveAnalytics, type ScannerAnalytics, type ScannerRunStats } from "@/features/finance/slipScanner/analytics/scannerAnalytics";
import { useScannerAnalyticsStore } from "@/features/finance/slipScanner/store/scannerAnalyticsStore";

export interface UseScannerAnalytics {
  analytics: ScannerAnalytics; // derived rates + speeds over accumulated totals
  recordRun: (run: ScannerRunStats) => void;
  reset: () => void;
}

// Exposes the derived scanner analytics (duplicate rate, QR detection rate, OCR
// usage rate, cache-hit rate, import success rate, average scan speed) over the
// persisted totals, plus recording a completed run.
export function useScannerAnalytics(): UseScannerAnalytics {
  const totals = useScannerAnalyticsStore((state) => state.totals);
  const recordRun = useScannerAnalyticsStore((state) => state.recordRun);
  const reset = useScannerAnalyticsStore((state) => state.reset);

  const analytics = useMemo(() => deriveAnalytics(totals), [totals]);

  return { analytics, recordRun, reset };
}
