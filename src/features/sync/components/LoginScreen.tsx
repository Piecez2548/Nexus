import { useState, type FormEvent } from "react";
import { Zap } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

const inputClassName =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-3 outline-none focus:border-violet-500";

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
      className="w-full max-w-sm space-y-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-600"
          style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
        >
          <Zap size={22} className="text-white" fill="currentColor" />
        </div>

        <div>
          <h1 className="text-xl font-bold">
            {mode === "signUp" ? t("login.createAccount") : t("login.welcomeBack")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("settings.processing") : mode === "signUp" ? t("settings.signUp") : t("settings.signIn")}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
        className="w-full text-center text-sm text-violet-500 hover:underline"
      >
        {mode === "signUp" ? t("settings.hasAccountSignIn") : t("settings.noAccountSignUp")}
      </button>
    </form>
  );
}
