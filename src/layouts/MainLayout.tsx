import { lazy, Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileTabBar from "./MobileTabBar";
import MobileMoreMenu from "./MobileMoreMenu";
import RouteAccessibility from "./RouteAccessibility";
import ToastContainer from "@/components/ui/ToastContainer";
import CommandPalette from "@/platform/commandPalette/CommandPalette";
import ScanRecoveryNotice from "@/features/finance/slipScanner/components/ScanRecoveryNotice";
import PendingPaymentSheet from "@/features/finance/notificationCapture/components/PendingPaymentSheet";
import SubscriptionDueCheck from "@/features/finance/components/SubscriptionDueCheck";
import LoadingState from "@/components/ui/LoadingState";
import { useTranslation } from "@/i18n/useTranslation";
import { useUIStore } from "@/features/finance/store/uiStore";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";

// These two drawers are reachable from every page (the header's own "Add"
// button, plus Quick Add tiles), so mounting them eagerly here — as a
// plain top-level import — pulled their entire dependency chain
// (react-hook-form, zod, the trade/transaction schemas) into the bundle
// every single page loads, even ones with nothing to do with transactions
// or trades. Lazy-loaded instead, and only added to the tree the first
// time the user actually opens one — never unmounted again after that so
// Drawer's own close exit-animation keeps working normally on every
// subsequent open/close.
const TransactionDrawer = lazy(() => import("@/features/finance/components/TransactionDrawer"));
const TradeDrawer = lazy(() => import("@/features/trading/components/TradeDrawer"));

export default function MainLayout() {
  const reducedMotion = useReducedMotion();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const isTransactionDrawerOpen = useUIStore((s) => s.isTransactionDrawerOpen);
  const isTradeDrawerOpen = useTradingUIStore((s) => s.isTradeDrawerOpen);
  const [hasOpenedTransactionDrawer, setHasOpenedTransactionDrawer] = useState(false);
  const [hasOpenedTradeDrawer, setHasOpenedTradeDrawer] = useState(false);

  useEffect(() => {
    if (isTransactionDrawerOpen) setHasOpenedTransactionDrawer(true);
  }, [isTransactionDrawerOpen]);

  useEffect(() => {
    if (isTradeDrawerOpen) setHasOpenedTradeDrawer(true);
  }, [isTradeDrawerOpen]);

  return (
    <div className="nexus-main flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <a className="main-skip-link" href="#main-content">{t("common.skipToContent")}</a>
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8">
          <Suspense fallback={<LoadingState label={t("common.loading")} />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            <RouteAccessibility />
          </Suspense>
        </main>
      </div>

      <MobileTabBar onMoreClick={() => setIsMoreOpen(true)} />
      <MobileMoreMenu open={isMoreOpen} onClose={() => setIsMoreOpen(false)} />

      <Suspense fallback={null}>
        {hasOpenedTransactionDrawer && <TransactionDrawer />}
        {hasOpenedTradeDrawer && <TradeDrawer />}
      </Suspense>

      <ToastContainer />
      <CommandPalette />
      <ScanRecoveryNotice />
      <PendingPaymentSheet />
      <SubscriptionDueCheck />
    </div>
  );
}
