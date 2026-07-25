import Drawer from "@/components/ui/Drawer";
import TransactionForm from "@/features/finance/components/TransactionForm";
import { useUIStore } from "@/features/finance/store/uiStore";

export default function TransactionDrawer() {
  const { isTransactionDrawerOpen, closeTransactionDrawer } = useUIStore();

  return (
    <Drawer open={isTransactionDrawerOpen} onClose={closeTransactionDrawer}>
      <TransactionForm />
    </Drawer>
  );
}
