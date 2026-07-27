import { useState, type FormEvent } from "react";
import { Zap } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/80 p-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

export default function LoginScreen() {
  const { loading, error, needsEmailConfirmation, signUp, signIn } = useAuthStore();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (mode === "signUp") {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-9 shadow-2xl shadow-zinc-900/10 ring-1 ring-zinc-900/5 dark:shadow-black/50 dark:ring-white/5"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 scale-150 rounded-full bg-brand-500/25 blur-xl" />
          <div
            className="relative flex h-14 w-14 items-center justify-center bg-gradient-to-br from-brand-500 to-brand-glow shadow-lg shadow-brand-600/30"
            style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
          >
            <Zap size={24} className="text-white" fill="currentColor" />
          </div>
        </div>

        <div>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight">
            {mode === "signUp" ? t("login.createAccount") : t("login.welcomeBack")}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "signUp" ? t("login.createAccountSubtitle") : t("login.welcomeBackSubtitle")}
          </p>
        </div>
      </div>

      <FormField label="อีเมล" htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
      </FormField>

      <FormField label="รหัสผ่าน" htmlFor="login-password">
        <input
          id="login-password"
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
        className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        {loading ? t("settings.processing") : mode === "signUp" ? t("settings.signUp") : t("settings.signIn")}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
        className="w-full text-center text-sm font-medium text-brand-500 hover:underline"
      >
        {mode === "signUp" ? t("settings.hasAccountSignIn") : t("settings.noAccountSignUp")}
      </button>
    </form>
  );
}
