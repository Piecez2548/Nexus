import { formatEta, type ScanProgressSnapshot } from "@/features/finance/slipScanner/progress/scanProgress";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  progress: ScanProgressSnapshot;
}

// Scan Progress Dashboard (GS-034): renders the live scan metrics from a
// computed snapshot (scanned / QR / OCR / imported / remaining / speed / ETA)
// plus a progress bar. Presentational — the parent recomputes the snapshot as
// counters change (computeScanProgress), which drives the real-time updates.
export default function ScanProgressDashboard({ progress }: Props) {
  const { t } = useTranslation();
  const unknown = t("slipScanner.progressDashboard.unknown");

  const stats: Array<{ key: string; label: string; value: string }> = [
    { key: "scanned", label: t("slipScanner.progressDashboard.scanned"), value: String(progress.scanned) },
    { key: "qrDetected", label: t("slipScanner.progressDashboard.qrDetected"), value: String(progress.qrDetected) },
    { key: "ocrProcessed", label: t("slipScanner.progressDashboard.ocrProcessed"), value: String(progress.ocrProcessed) },
    { key: "imported", label: t("slipScanner.progressDashboard.imported"), value: String(progress.imported) },
    {
      key: "remaining",
      label: t("slipScanner.progressDashboard.remaining"),
      value: progress.remaining !== null ? String(progress.remaining) : unknown,
    },
    {
      key: "speed",
      label: t("slipScanner.progressDashboard.speed"),
      value: t("slipScanner.progressDashboard.perSecond", { n: progress.speedPerSec.toFixed(1) }),
    },
    { key: "eta", label: t("slipScanner.progressDashboard.eta"), value: formatEta(progress.etaMs) },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-lg font-semibold">{t("slipScanner.progressDashboard.title")}</h3>

      {progress.percent !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${progress.percent}%` }}
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.key} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
