import { Pencil, Trash2 } from "lucide-react";

import { useSubscriptionStore } from "@/features/finance/store/subscriptionStore";
import { getIcon } from "@/features/finance/constants/icons";
import { resolveNextBillingDate, daysUntil, monthlyEquivalent } from "@/features/finance/utils/subscriptionMath";
import { toErrorMessage } from "@/utils/asyncState";
import { useToast } from "@/hooks/useToast";
import IconBadge from "@/components/ui/IconBadge";
import { useTranslation } from "@/i18n/useTranslation";
import type { RecurringFrequency, Subscription, SubscriptionStatus } from "@/features/finance/types";

const FREQUENCY_LABEL_KEYS: Record<RecurringFrequency, string> = {
  daily: "common.daily",
  weekly: "common.weekly",
  monthly: "common.monthly",
  yearly: "common.yearly",
};

const STATUS_LABEL_KEYS: Record<SubscriptionStatus, string> = {
  active: "subscriptions.statusActive",
  paused: "subscriptions.statusPaused",
  cancelled: "subscriptions.statusCancelled",
};

const STATUS_BADGE_CLASSES: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/15 text-green-600 dark:text-green-400",
  paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  cancelled: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

interface Props {
  subscription: Subscription;
  onEdit: () => void;
}

export default function SubscriptionCard({ subscription, onEdit }: Props) {
  const { deleteSubscription } = useSubscriptionStore();
  const toast = useToast();
  const { t } = useTranslation();

  const Icon = getIcon(subscription.icon);
  const isDimmed = subscription.status !== "active";

  const resolvedDate = resolveNextBillingDate(subscription.nextBillingDate, subscription.billingFrequency);
  const remainingDays = daysUntil(resolvedDate);

  async function handleDelete() {
    if (subscription.id === undefined) return;

    try {
      await deleteSubscription(subscription.id);
      toast.success(t("subscriptions.deletedSuccess"));
    } catch (err) {
      toast.error(toErrorMessage(err));
    }
  }

  return (
    <div className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 ${isDimmed ? "opacity-70" : ""}`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={<Icon size={18} />} color={subscription.color} />

          <div>
            <h3 className="font-semibold">{subscription.name}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-500">
              {t(FREQUENCY_LABEL_KEYS[subscription.billingFrequency])} · ฿{subscription.amount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label={`Edit ${subscription.name}`}
            className="rounded-lg p-2 transition hover:bg-brand-600/20 hover:text-brand-400"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => void handleDelete()}
            aria-label={`Delete ${subscription.name}`}
            className="rounded-lg p-2 transition hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[subscription.status]}`}>
          {t(STATUS_LABEL_KEYS[subscription.status])}
        </span>

        {subscription.status === "active" && (
          <span className="text-zinc-600 dark:text-zinc-400">
            {remainingDays <= 0
              ? t("subscriptions.dueToday")
              : t("subscriptions.dueInDays", { days: remainingDays })}
          </span>
        )}
      </div>

      {(subscription.category || subscription.account) && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          {[subscription.category, subscription.account].filter(Boolean).join(" · ")}
        </p>
      )}

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        ฿{monthlyEquivalent(subscription.amount, subscription.billingFrequency).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        {t("common.perMonth")}
      </p>

      {subscription.note && (
        <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-500">{subscription.note}</p>
      )}
    </div>
  );
}
