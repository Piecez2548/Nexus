import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useTranslation } from "@/i18n/useTranslation";

interface Props {
  count: number;
  onDone: () => void;
}

const SPARKS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
const SHOW_MS = 1800;

// Short celebratory confirmation after slips were imported: a check mark
// that draws itself inside a ring, with a small burst of sparks. Ignores
// pointer events so it never blocks the app, dismisses itself, and is static
// (no sparks, no drawing) for people who prefer reduced motion.
export default function ScanSuccessBurst({ count, onDone }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      role="status"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="pointer-events-none fixed inset-0 z-[75] flex flex-col items-center justify-center gap-4"
    >
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/90 shadow-xl backdrop-blur dark:bg-zinc-900/90">
        {!reducedMotion &&
          SPARKS.map((angle) => (
            <motion.span
              key={angle}
              aria-hidden="true"
              className="absolute h-2 w-2 rounded-full bg-emerald-400"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos(angle) * 78, y: Math.sin(angle) * 78, opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            />
          ))}
        <svg viewBox="0 0 52 52" className="h-16 w-16" aria-hidden="true">
          <motion.circle
            cx="26"
            cy="26"
            r="23"
            fill="none"
            strokeWidth="3"
            className="stroke-emerald-500"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <motion.path
            d="M15 27 l8 8 l14 -16"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-emerald-500"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
          />
        </svg>
      </div>
      <p className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold shadow dark:bg-zinc-900/90">
        {t("slipScanner.galleryScan.burstSaved", { count })}
      </p>
    </motion.div>
  );
}
