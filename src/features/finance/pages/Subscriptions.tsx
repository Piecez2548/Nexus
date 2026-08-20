import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { useSubscriptionStats } from "@/features/finance/hooks/useSubscriptionStats";
import { resolveNextBillingDate } from "@/features/finance/utils/subscriptionMath";
import SubscriptionSummaryGrid from "@/features/finance/components/SubscriptionSummaryGrid";
import SubscriptionCard from "@/features/finance/components/SubscriptionCard";
import SubscriptionForm from "@/features/finance/components/SubscriptionForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Subscription, SubscriptionStatus } from "@/features/finance/types";

// Active subscriptions first (soonest-due first within that group), then
// paused, then cancelled -- matches this page's own summary grid ordering
// and keeps what needs attention (an active bill coming due) at the top.
const STATUS_RANK: Record<SubscriptionStatus, number> = { active: 0, paused: 1, cancelled: 2 };

function sortSubscriptions(subscriptions: Subscription[]): Subscription[] {
  return [...subscriptions].sort((a, b) => {
    const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;

    const aDate = resolveNextBillingDate(a.nextBillingDate, a.billingFrequency, undefined, a.billingAnchorDay);
    const bDate = resolveNextBillingDate(b.nextBillingDate, b.billingFrequency, undefined, b.billingAnchorDay);
    return aDate.localeCompare(bDate);
  });
}

export default function Subscriptions() {
  const { subscriptions, loading, error, loadSubscriptions } = useSubscriptionStore();
  const stats = useSubscriptionStats();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  function handleAdd() {
    setSelectedSubscription(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedSubscription(null);
  }

  const sorted = sortSubscriptions(subscriptions);

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("subscriptions.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("subscriptions.addSubscription")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadSubscriptions} />
      ) : loading && subscriptions.length === 0 ? (
        <LoadingState label={t("subscriptions.loading")} />
      ) : subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("subscriptions.emptyState")}
        </div>
      ) : (
        <>
          <SubscriptionSummaryGrid {...stats} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={() => handleEdit(subscription)}
              />
            ))}
          </div>
        </>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <SubscriptionForm subscription={selectedSubscription} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
