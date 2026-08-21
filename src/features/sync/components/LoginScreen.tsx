import { useState, type FormEvent } from "react";
import { Zap, Check, X, Wallet, Target } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useTranslation } from "@/i18n/useTranslation";
import FormField from "@/components/ui/FormField";

// Not exhaustive -- a small, hand-picked list rather than a full phone-number
// library (none is installed anywhere in this codebase). +66 first since
// Thai is this app's primary audience.
const COUNTRY_CODES = ["+66", "+1", "+44", "+65", "+81", "+82", "+86"];

// Deliberately forced dark regardless of the app's own light/dark/system
// theme setting -- a distinct "arrival" identity for the auth screen, same
// pattern many apps use for onboarding/auth. `.dark` on this wrapper makes
// every dark: utility below (including FormField's own, a shared component
// used elsewhere in light mode) resolve to its dark styling via this app's
// `@custom-variant dark (&:where(.dark, .dark *))` (src/styles/index.css) --
// no changes needed to FormField or any other shared component.
function fieldClassName(touched: boolean, valid: boolean): string {
  const state = !touched
    ? "border-white/10 focus:border-brand-400"
    : valid
      ? "border-emerald-500/70 focus:border-emerald-500"
      : "border-red-500/70 focus:border-red-500";
  return `w-full rounded-2xl border ${state} bg-white/5 p-3 pr-11 text-white outline-none transition placeholder:text-zinc-600 focus:ring-4 focus:ring-brand-500/15`;
}

function ValidationBadge({ touched, valid }: { touched: boolean; valid: boolean }) {
  if (!touched) return null;
  return (
    <span
      className={`pointer-events-none absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg ${
        valid ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      {valid ? <Check size={14} /> : <X size={14} />}
    </span>
  );
}

export default function LoginScreen() {
  const { loading, error, needsEmailConfirmation, signUp, signIn } = useAuthStore();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const firstNameValid = firstName.trim().length > 0;
  const lastNameValid = lastName.trim().length > 0;
  const phoneValid = phone.trim().length >= 6;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (mode === "signUp") {
      await signUp(email, password, { firstName, lastName, phone: `${countryCode}${phone}` });
    } else {
      await signIn(email, password);
    }
  }

  return (
    <div className="dark w-full max-w-5xl overflow-hidden rounded-3xl bg-zinc-950 shadow-2xl shadow-black/40 ring-1 ring-white/10 md:grid md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden p-10 text-white md:flex">
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="pointer-events-none absolute -left-16 -top-16 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-brand-glow/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <div
          className="relative z-10 flex h-14 w-14 items-center justify-center bg-white/10 ring-1 ring-white/20 backdrop-blur-md"
          style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
        >
          <Zap size={24} className="text-white" fill="currentColor" />
        </div>

        <div className="relative z-10">
          <h2 className="text-balance text-4xl font-extrabold tracking-tight">Nexus</h2>
          <p className="mt-3 max-w-xs text-sm text-white/70">{t("login.tagline")}</p>
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/30">
              <Wallet size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">{t("login.featureFinanceTitle")}</p>
              <p className="text-xs text-white/60">{t("login.featureFinanceSubtitle")}</p>
            </div>
          </div>

          <div className="ml-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30">
              <Target size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">{t("login.featureHabitsTitle")}</p>
              <p className="text-xs text-white/60">{t("login.featureHabitsSubtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-zinc-950 p-8 sm:p-10">
        <div>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-white">
            {mode === "signUp" ? t("login.createAccount") : t("login.welcomeBack")}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "signUp" ? t("login.createAccountSubtitle") : t("login.welcomeBackSubtitle")}
          </p>
        </div>

        <div role="tablist" className="flex rounded-2xl bg-white/5 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signUp"}
            onClick={() => setMode("signUp")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              mode === "signUp" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t("settings.signUp")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signIn"}
            onClick={() => setMode("signIn")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              mode === "signIn" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t("settings.signIn")}
          </button>
        </div>

        {mode === "signUp" && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("login.firstNameLabel")} htmlFor="login-first-name">
              <div className="relative">
                <input
                  id="login-first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => markTouched("firstName")}
                  className={fieldClassName(Boolean(touched.firstName), firstNameValid)}
                />
                <ValidationBadge touched={Boolean(touched.firstName)} valid={firstNameValid} />
              </div>
            </FormField>

            <FormField label={t("login.lastNameLabel")} htmlFor="login-last-name">
              <div className="relative">
                <input
                  id="login-last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => markTouched("lastName")}
                  className={fieldClassName(Boolean(touched.lastName), lastNameValid)}
                />
                <ValidationBadge touched={Boolean(touched.lastName)} valid={lastNameValid} />
              </div>
            </FormField>
          </div>
        )}

        {mode === "signUp" && (
          <FormField label={t("login.phoneLabel")} htmlFor="login-phone">
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code} className="bg-zinc-900">
                    {code}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <input
                  id="login-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => markTouched("phone")}
                  className={fieldClassName(Boolean(touched.phone), phoneValid)}
                />
                <ValidationBadge touched={Boolean(touched.phone)} valid={phoneValid} />
              </div>
            </div>
          </FormField>
        )}

        <FormField label={t("lock.emailLabel")} htmlFor="login-email">
          <div className="relative">
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              className={fieldClassName(Boolean(touched.email), emailValid)}
            />
            <ValidationBadge touched={Boolean(touched.email)} valid={emailValid} />
          </div>
        </FormField>

        <FormField label={t("settings.passwordLabel")} htmlFor="login-password">
          <div className="relative">
            <input
              id="login-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              className={fieldClassName(Boolean(touched.password), passwordValid)}
            />
            <ValidationBadge touched={Boolean(touched.password)} valid={passwordValid} />
          </div>
        </FormField>

        {needsEmailConfirmation && <p className="text-sm text-amber-400">{t("settings.confirmEmailSpamNote")}</p>}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
        >
          {loading ? t("settings.processing") : mode === "signUp" ? t("settings.signUp") : t("settings.signIn")}
        </button>
      </form>
    </div>
  );
}
