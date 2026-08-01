import MobileRowCard from "@/components/ui/MobileRowCard";
import { useTranslation } from "@/i18n/useTranslation";
import type { Transaction } from "@/features/finance/types";

interface Props {
  transactions: Transaction[];
}

// The drawer is always a single narrow column (Drawer.tsx caps at max-w-md),
// so unlike every other list in this feature there's no desktop-table
// counterpart to switch to — MobileRowCard alone covers every width here.
export default function CategoryTransactionList({ transactions }: Props) {
  const { t } = useTranslation();

  if (transactions.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("aiAnalytics.categoryDetail.noTransactions")}</p>;
  }

  return (
    <div className="space-y-2">
      {transactions.map((item) => (
        <MobileRowCard
          key={item.id ?? `${item.date}-${item.amount}-${item.title}`}
          title={item.title}
          subtitle={item.date}
          trailing={<span className="font-medium">฿{item.amount.toLocaleString()}</span>}
        />
      ))}
    </div>
  );
}
