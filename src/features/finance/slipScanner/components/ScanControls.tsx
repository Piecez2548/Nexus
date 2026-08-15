import { Pause, Play, X } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  running: boolean; // true -> Pause; false (paused) -> Resume
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

// Pause/Resume/Cancel buttons for an in-progress orchestrator-backed scan --
// extracted from FullGalleryScanPanel so GalleryScanFlow (which needs to
// trigger the scan itself, after bank selection, rather than own a "Start"
// button) can reuse the same controls instead of re-implementing them. Only
// rendered by the parent while the scan is actually running/paused; status
// messages (error, cancelled) are the parent's own concern since whether
// they're shown doesn't depend on whether these buttons are.
export default function ScanControls({ running, onPause, onResume, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {running ? (
        <button
          type="button"
          onClick={onPause}
          // active: (not just hover:) so a tap gives immediate visible
          // feedback on touch devices, which don't reliably trigger :hover.
          className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
        >
          <Pause size={16} />
          {t("slipScanner.progressDashboard.pause")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onResume}
          className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-700"
        >
          <Play size={16} />
          {t("slipScanner.progressDashboard.resume")}
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10 active:bg-red-500/25"
      >
        <X size={16} />
        {t("slipScanner.progressDashboard.cancelScan")}
      </button>
    </div>
  );
}
