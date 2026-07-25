import Drawer from "@/components/ui/Drawer";
import TradeForm from "@/features/trading/components/TradeForm";
import { useTradingUIStore } from "@/features/trading/store/tradingUIStore";

export default function TradeDrawer() {
  const { isTradeDrawerOpen, closeTradeDrawer } = useTradingUIStore();

  return (
    <Drawer open={isTradeDrawerOpen} onClose={closeTradeDrawer}>
      <TradeForm />
    </Drawer>
  );
}
