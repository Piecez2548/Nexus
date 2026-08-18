import { useMemo } from "react";
import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { calculateSubscriptionStats } from "@/features/finance/utils/subscriptionMath";

export function useSubscriptionStats() {
  const { subscriptions } = useSubscriptionStore();
  return useMemo(() => calculateSubscriptionStats(subscriptions), [subscriptions]);
}
