import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useMerchantStore } from "@/features/finance/store/merchantStore";
import { useCategoryStore } from "@/features/finance/store/categoryStore";
import MerchantTable from "@/features/finance/components/MerchantTable";
import MerchantForm from "@/features/finance/components/MerchantForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Merchant } from "@/features/finance/types";

export default function Merchants() {
  const { merchants, loading, error, loadMerchants } = useMerchantStore();
  const { loadCategories } = useCategoryStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadMerchants();
    // The form's category <select> is populated from the same store every
    // other entity form (e.g. SubscriptionForm) already relies on being
    // loaded -- fetched here too so this page works even when it's the
    // first finance page a session visits.
    loadCategories();
  }, [loadMerchants, loadCategories]);

  function handleAdd() {
    setSelectedMerchant(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(merchant: Merchant) {
    setSelectedMerchant(merchant);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedMerchant(null);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("merchants.pageTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">{t("merchants.pageDescription")}</p>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("merchants.addMerchant")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadMerchants} />
      ) : loading && merchants.length === 0 ? (
        <LoadingState label={t("merchants.loading")} />
      ) : merchants.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("merchants.emptyState")}
        </div>
      ) : (
        <MerchantTable merchants={merchants} onEdit={handleEdit} />
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <MerchantForm merchant={selectedMerchant} onDone={handleClose} />
      </Drawer>

    </div>
  );
}
