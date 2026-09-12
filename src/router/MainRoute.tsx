import MainLayout from "@/layouts/MainLayout";
import AppLockGate from "@/features/lock/components/AppLockGate";
import { SyncProvider } from "@/features/sync/components/SyncProvider";

// Keep Main-only modules out of the All/login startup path. Gate order is unchanged.
export default function MainRoute() {
  return <AppLockGate><SyncProvider /><MainLayout /></AppLockGate>;
}
