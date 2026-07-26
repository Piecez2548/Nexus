import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useAccountStore } from "@/features/finance/store/accountStore";
import AccountTable from "@/features/finance/components/AccountTable";
import AccountForm from "@/features/finance/components/AccountForm";
import MergeAccountForm from "@/features/finance/components/MergeAccountForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { Account } from "@/features/finance/types";

type DrawerState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; account: Account }
  | { mode: "merge"; account: Account };

export default function Accounts() {
  const { accounts, loading, error, loadAccounts } = useAccountStore();
  const [drawerState, setDrawerState] = useState<DrawerState>({ mode: "closed" });
  const { t } = useTranslation();

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const closeDrawer = () => setDrawerState({ mode: "closed" });

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("accounts.pageTitle")}</h1>

        <button
          onClick={() => setDrawerState({ mode: "add" })}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-zinc-900 dark:text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("accounts.addAccount")}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadAccounts} />
      ) : loading && accounts.length === 0 ? (
        <LoadingState label={t("accounts.loading")} />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {t("accounts.emptyState")}
        </div>
      ) : (
        <AccountTable
          accounts={accounts}
          onEdit={(account) => setDrawerState({ mode: "edit", account })}
          onMerge={(account) => setDrawerState({ mode: "merge", account })}
        />
      )}

      <Drawer open={drawerState.mode !== "closed"} onClose={closeDrawer}>
        {drawerState.mode === "merge" ? (
          <MergeAccountForm
            sourceAccount={drawerState.account}
            accounts={accounts}
            onDone={closeDrawer}
          />
        ) : (
          <AccountForm
            account={drawerState.mode === "edit" ? drawerState.account : null}
            onDone={closeDrawer}
          />
        )}
      </Drawer>

    </div>
  );
}
