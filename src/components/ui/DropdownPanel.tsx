import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface Props {
  open: boolean;
  className?: string;
  children: ReactNode;
}

// Shared entrance/exit animation for every small popover menu (user menu,
// notifications, search results) so they all feel the same instead of
// snapping open/closed inconsistently from one to the next.
export default function DropdownPanel({ open, className, children }: Props) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
