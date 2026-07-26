import { useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { isSyncConfigured } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/useToast";
import FormField from "@/components/ui/FormField";
import { useTranslation } from "@/i18n/useTranslation";
import SettingsCard from "./SettingsCard";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-brand-500";

export default function SyncSettings() {
  const { user, loading, error, needsEmailConfirmation, syncing, lastSyncedAt, signUp, signIn, signOut, sync } =
    useAuthStore();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const toast = useToast();
  const { t, language } = useTranslation();

  if (!isSyncConfigured) {
    return (
      <SettingsCard
        title={t("settings.syncTitle")}
        description={t("settings.syncNotConfiguredDescription")}
      >
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <CloudOff size={18} />
          {t("settings.localOnlyData")}
        </div>
      </SettingsCard>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (mode === "signUp") {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }

    const state = useAuthStore.getState();
    if (state.user) {
      toast.success(mode === "signUp" ? t("settings.signUpSuccess") : t("settings.signInSuccess"));
    } else if (state.needsEmailConfirmation) {
      toast.info(t("settings.confirmEmailBeforeSignIn"));
    }
  }

  async function handleSyncNow() {
    await sync();
    if (!useAuthStore.getState().error) {
      toast.success(t("settings.syncSuccess"));
    }
  }

  async function handleSignOut() {
    await signOut();
    toast.success(t("settings.signedOutMessage"));
  }

  if (user) {
    return (
      <SettingsCard
        title={t("settings.syncTitle")}
        description={t("settings.syncSignedInDescription")}
      >
        <div className="flex items-center gap-3 text-sm text-green-500">
          <Cloud size={18} />
          {t("settings.signedInAs", { email: user.email ?? "" })}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {syncing
            ? t("settings.syncing")
            : lastSyncedAt
              ? t("settings.lastSynced", {
                  datetime: new Date(lastSyncedAt).toLocaleString(language === "th" ? "th-TH" : "en-US"),
                })
              : t("settings.neverSynced")}
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {t("settings.syncNow")}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("settings.signOut")}
          </button>
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title={t("settings.syncTitle")}
      description={t("settings.syncOptionalDescription")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="อีเมล" htmlFor="sync-email">
          <input
            id="sync-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </FormField>

        <FormField label="รหัสผ่าน" htmlFor="sync-password">
          <input
            id="sync-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
        </FormField>

        {needsEmailConfirmation && (
          <p className="text-sm text-amber-500">
            {t("settings.confirmEmailSpamNote")}
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t("settings.processing") : mode === "signUp" ? t("settings.signUp") : t("settings.signIn")}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
          className="w-full text-center text-sm text-brand-500 hover:underline"
        >
          {mode === "signUp" ? t("settings.hasAccountSignIn") : t("settings.noAccountSignUp")}
        </button>
      </form>
    </SettingsCard>
  );
}
