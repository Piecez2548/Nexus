import { useMemo } from "react";
import { useNetWorthItemStore } from "@/features/finance/store/netWorthItemStore";
import { calculateNetWorthTotals } from "@/features/finance/utils/netWorthMath";

export function useNetWorthStats() {
  const { items } = useNetWorthItemStore();

  return useMemo(() => {
    const totals = calculateNetWorthTotals(items);
    return {
      ...totals,
      itemsCount: items.length,
      assetsCount: items.filter((i) => i.kind === "asset").length,
      liabilitiesCount: items.filter((i) => i.kind === "liability").length,
    };
  }, [items]);
}
