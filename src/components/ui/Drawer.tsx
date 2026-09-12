import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { useTranslation } from "@/i18n/useTranslation";
import { useModalA11y } from "./useModalA11y";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label?: string;
}

// A single close button here (rather than each form implementing its own)
// guarantees every drawer is dismissible the same way. This matters most on
// mobile, where the drawer covers the full screen width and leaves no
// visible backdrop left to tap.
export default function Drawer({
  open,
  onClose,
  children,
  label,
}: Props) {
  const reducedMotion = useReducedMotion();
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  useModalA11y({ open, onClose, containerRef: panelRef });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label ?? t("common.detailsPanel")}
            tabIndex={-1}
            className="fixed right-0 top-0 z-50 h-dvh w-full max-w-md overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6"
            style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
            initial={{ x: reducedMotion ? 0 : 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reducedMotion ? 0 : 420, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.back")}
              className="absolute right-4 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-600 dark:text-zinc-400 shadow transition hover:bg-zinc-200 dark:hover:bg-zinc-800"
              style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
            >
              <X size={18} />
            </button>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
