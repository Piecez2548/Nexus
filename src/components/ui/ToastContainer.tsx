import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, TriangleAlert, Info, X } from "lucide-react";

import { useToastStore, type ToastType } from "@/store/toastStore";
import { useTranslation } from "@/i18n/useTranslation";

const TOAST_STYLES: Record<ToastType, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-green-500/30 bg-green-500/10 text-green-500" },
  error: { icon: XCircle, className: "border-red-500/30 bg-red-500/10 text-red-500" },
  warning: { icon: TriangleAlert, className: "border-amber-500/30 bg-amber-500/10 text-amber-500" },
  info: { icon: Info, className: "border-brand-500/30 bg-brand-500/10 text-brand-500" },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { icon: Icon, className } = TOAST_STYLES[toast.type];

          return (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg dark:bg-zinc-900 ${className}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />

              <p className="flex-1 text-sm text-zinc-900 dark:text-white">{toast.message}</p>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t("common.dismissNotification")}
                className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
