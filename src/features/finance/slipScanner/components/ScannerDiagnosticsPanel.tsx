import { useEffect, useState } from "react";

import { getScannerDiagnostics, subscribeScannerDiagnostics, type ScannerDiagnostic } from "@/features/finance/slipScanner/services/scannerDiagnostics";
import { useTranslation } from "@/i18n/useTranslation";

export default function ScannerDiagnosticsPanel() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<ScannerDiagnostic[]>(getScannerDiagnostics);

  useEffect(
    () => subscribeScannerDiagnostics((event) => {
      setEvents((current) => [...current.slice(-19), event]);
    }),
    [],
  );

  if (events.length === 0) return null;

  return (
    <details className="fixed bottom-3 right-3 z-[90] max-h-64 w-[min(24rem,calc(100vw-1.5rem))] overflow-auto rounded-xl border border-zinc-300 bg-white/95 p-3 text-xs shadow-xl dark:border-zinc-700 dark:bg-zinc-950/95">
      <summary className="cursor-pointer font-semibold">{t("slipScanner.diagnostics.title")} ({events.length})</summary>
      <ol className="mt-2 space-y-1 font-mono">
        {events.slice(-20).map((event, index) => (
          <li key={`${event.at}-${index}`} className="flex flex-wrap gap-x-2">
            <time>{new Date(event.at).toLocaleTimeString()}</time>
            <span>{event.name}</span>
            {event.count !== undefined && <span>count={event.count}</span>}
            {event.durationMs !== undefined && <span>{event.durationMs}ms</span>}
            {event.errorCategory && <span>error={event.errorCategory}</span>}
          </li>
        ))}
      </ol>
    </details>
  );
}
