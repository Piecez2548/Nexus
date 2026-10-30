import { use } from "react";
import MainLayout from "@/layouts/MainLayout";
import AppLockGate from "@/features/lock/components/AppLockGate";
import { SyncProvider } from "@/features/sync/components/SyncProvider";
import { seedDatabase } from "@/database/seed";

// Default accounts/categories must exist before Main renders: the transaction
// and budget forms wait for them. Seeding is idempotent and Main-only.
const seeded = seedDatabase().catch(() => { /* Main still renders; forms show their own state. */ });

// Keep Main-only modules out of the All/login startup path. Gate order is unchanged.
export default function MainRoute() {
  use(seeded);
  return <AppLockGate><SyncProvider /><MainLayout /></AppLockGate>;
}
