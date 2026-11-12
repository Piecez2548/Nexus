import { motion, useReducedMotion } from "framer-motion";

import type { ScanProgressSnapshot } from "@/features/finance/slipScanner/progress/scanProgress";
import ScanControls from "@/features/finance/slipScanner/components/ScanControls";
import ScanProgressDashboard from "@/features/finance/slipScanner/components/ScanProgressDashboard";
import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  progress: ScanProgressSnapshot | null;
  running: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onBackground: () => void;
  // Also render the detailed counters (scanned / QR / OCR / speed / ETA)
  // under the ring -- used for scans the person started themselves.
  showDetails?: boolean;
}

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Full-screen progress for a gallery scan: a gradient ring with a soft glow
// that fills with the real percent (or spins while the total is still
// unknown), a slow orbiting dash ring for "alive" feedback, and a "run in
// background" button that hides this screen while the scan keeps going.
// Presentational only -- the parent owns the scan and its state. Motion is
// switched off for people who prefer reduced motion.
export default function ScanProgressRing({ progress, running, onPause, onResume, onCancel, onBackground, showDetails = false }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const percent = progress?.percent ?? null;
  const dashOffset = percent === null ? CIRCUMFERENCE * 0.75 : CIRCUMFERENCE * (1 - percent / 100);
  const animate = running && !reducedMotion;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("slipScanner.galleryScan.ringTitle")}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-white/95 p-6 backdrop-blur dark:bg-zinc-950/95"
    >
      <h2 className="text-xl font-semibold">{t("slipScanner.galleryScan.ringTitle")}</h2>

      <div className="relative h-60 w-60 shrink-0">
        {/* Soft pulsing glow behind the ring. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-4 rounded-full bg-brand-500/20 blur-2xl"
          animate={animate ? { opacity: [0.35, 0.85, 0.35], scale: [0.95, 1.08, 0.95] } : { opacity: 0.5 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Slow orbiting dashed ring. */}
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full"
          animate={animate ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="100" cy="100" r="98" fill="none" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" className="stroke-brand-400/60" />
        </motion.svg>

        <svg
          viewBox="0 0 200 200"
          className={`relative h-full w-full -rotate-90 ${percent === null && animate ? "motion-safe:animate-spin" : ""}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          aria-label={t("slipScanner.progressDashboard.title")}
        >
          <defs>
            <linearGradient id="scan-ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={RADIUS} fill="none" strokeWidth="12" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            stroke="url(#scan-ring-gradient)"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">{percent !== null ? `${percent}%` : "…"}</span>
          <span className="mt-1 text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {progress && progress.total !== null
              ? t("slipScanner.galleryScan.ringCount", { done: progress.scanned, total: progress.total })
              : t("slipScanner.galleryScan.ringPreparing")}
          </span>
        </div>
      </div>

      {showDetails && progress && (
        <div className="w-full max-w-md">
          <ScanProgressDashboard progress={progress} />
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onBackground}
          className="min-h-11 rounded-xl bg-brand-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          {t("slipScanner.galleryScan.runInBackground")}
        </button>
        <ScanControls running={running} onPause={onPause} onResume={onResume} onCancel={onCancel} />
      </div>
    </motion.div>
  );
}
