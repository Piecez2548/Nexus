import { useEffect } from "react";

import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";
import RecipientProfileTable from "@/features/finance/components/RecipientProfileTable";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";

export default function RecipientProfiles() {
  const { profiles, loading, error, loadProfiles } = useRecipientProfileStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">{t("recipients.pageTitle")}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-500">
          {t("recipients.description")}
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadProfiles} />
      ) : loading && profiles.length === 0 ? (
        <LoadingState label={t("recipients.loading")} />
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("recipients.emptyState")}
        </div>
      ) : (
        <RecipientProfileTable profiles={profiles} />
      )}

    </div>
  );
}
