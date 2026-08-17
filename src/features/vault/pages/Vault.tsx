import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldAlert, Lock, Search } from "lucide-react";

import { useVaultEntryStore } from "@/features/vault/store/vaultEntryStore";
import VaultEntryCard from "@/features/vault/components/VaultEntryCard";
import VaultEntryForm from "@/features/vault/components/VaultEntryForm";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import EnableEncryptionForm from "@/features/encryption/components/EnableEncryptionForm";
import Drawer from "@/components/ui/Drawer";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n/useTranslation";
import type { VaultEntry, VaultEntryType } from "@/features/vault/types";

// Vault always encrypts (see vaultEntryRepository.ts's comment) -- but
// createEncryptedRepository only encrypts when the device-wide
// `encryptionEnabled` flag is on; without this gate, a device that hasn't
// enabled encryption yet would silently store secrets as plaintext. Gating
// the whole page on it makes "Vault is usable" and "encryption is on"
// equivalent by construction, reusing the exact same enable flow Settings
// already offers rather than a parallel one.
function EncryptionGate() {
  const isPinEnabled = useAppLockStore((s) => s.isEnabled());
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const message = !isSyncConfigured || !user ? t("settings.encryptionNeedsSignIn") : !isPinEnabled ? t("settings.encryptionNeedsPin") : null;

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
      <ShieldAlert size={32} className="mx-auto text-amber-500" />
      <h2 className="text-lg font-semibold">{t("vault.encryptionRequiredTitle")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("vault.encryptionRequiredDescription")}</p>

      {message ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
      ) : (
        <EnableEncryptionForm onDone={() => {}} />
      )}
    </div>
  );
}

export default function Vault() {
  const { entries, loading, error, loadEntries } = useVaultEntryStore();
  const encryptionEnabled = useAppLockStore((s) => s.encryptionEnabled);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<VaultEntryType | "all">("all");
  const { t } = useTranslation();

  useEffect(() => {
    if (encryptionEnabled) loadEntries();
  }, [encryptionEnabled, loadEntries]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (query && !entry.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [entries, search, typeFilter]);

  function handleAdd() {
    setSelectedEntry(null);
    setIsDrawerOpen(true);
  }

  function handleEdit(entry: VaultEntry) {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  }

  function handleClose() {
    setIsDrawerOpen(false);
    setSelectedEntry(null);
  }

  if (!encryptionEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Lock size={24} />
          <h1 className="text-3xl font-bold">{t("vault.pageTitle")}</h1>
        </div>
        <EncryptionGate />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("vault.pageTitle")}</h1>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700"
        >
          <Plus size={18} />
          {t("vault.addEntry")}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("vault.searchPlaceholder")}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 py-2.5 pl-9 pr-3 outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as VaultEntryType | "all")}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5 outline-none focus:border-brand-500"
        >
          <option value="all">{t("vault.filterAll")}</option>
          <option value="password">{t("vault.typePassword")}</option>
          <option value="note">{t("vault.typeNote")}</option>
          <option value="recoveryKey">{t("vault.typeRecoveryKey")}</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadEntries} />
      ) : loading && entries.length === 0 ? (
        <LoadingState label={t("vault.loading")} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
          {entries.length === 0 ? t("vault.emptyState") : t("vault.noSearchResults")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <VaultEntryCard key={entry.id} entry={entry} onEdit={() => handleEdit(entry)} />
          ))}
        </div>
      )}

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <VaultEntryForm entry={selectedEntry} onDone={handleClose} />
      </Drawer>
    </div>
  );
}
