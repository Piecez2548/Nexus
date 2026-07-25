import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileTabBar from "./MobileTabBar";
import MobileMoreMenu from "./MobileMoreMenu";
import TransactionDrawer from "@/features/finance/components/TransactionDrawer";
import TradeDrawer from "@/features/trading/components/TradeDrawer";
import ToastContainer from "@/components/ui/ToastContainer";
import LoadingState from "@/components/ui/LoadingState";
import { useTranslation } from "@/i18n/useTranslation";

export default function MainLayout() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <TopBar />

        <main className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8">
          <Suspense fallback={<LoadingState label={t("common.loading")} />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>

      <MobileTabBar onMoreClick={() => setIsMoreOpen(true)} />
      <MobileMoreMenu open={isMoreOpen} onClose={() => setIsMoreOpen(false)} />

      <TransactionDrawer />
      <TradeDrawer />
      <ToastContainer />
    </div>
  );
}
