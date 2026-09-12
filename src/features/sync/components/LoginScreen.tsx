import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, X, Wallet, Target } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useEntryTranslation } from "@/i18n/useEntryTranslation";
import FormField from "@/components/ui/FormField";
import "./loginScreen.css";

// Not exhaustive -- a small, hand-picked list rather than a full phone-number
// library (none is installed anywhere in this codebase). +66 first since
// Thai is this app's primary audience.
const COUNTRY_CODES = ["+66", "+1", "+44", "+65", "+81", "+82", "+86"];

// Arrival fields inherit the shared theme; validation only changes their state.
function fieldClassName(touched: boolean, valid: boolean): string {
  const state = !touched
    ? "border-white/10 focus:border-brand-400"
    : valid
      ? "border-emerald-500/70 focus:border-emerald-500"
      : "border-red-500/70 focus:border-red-500";
  return `login-input ${touched ? valid ? "is-valid" : "is-invalid" : ""} w-full rounded-2xl border ${state} bg-white/5 p-3 pr-11 text-white outline-none transition placeholder:text-zinc-600 focus:ring-4 focus:ring-brand-500/15`;
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
  const { t } = useEntryTranslation();

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
    <main className="login-page dark">
      <header className="login-header">
        <div className="login-brand" aria-label="Nexus">nexus<span>.</span></div>
        <span className="login-back" lang="en">Nexus All</span>
      </header>
      <div className="login-layout">
        <section className="login-story" aria-label="Nexus All">
          <div className="login-story-copy">
            <h2 lang="en">Your Nexus<br /><span>workspace.</span></h2>
            <p>{t("login.tagline")}</p>
          </div>
          <div className="login-scene" aria-hidden="true" />
          <div className="login-features">
            <div><Wallet size={20} aria-hidden="true" /><p><strong>{t("login.featureFinanceTitle")}</strong><span>{t("login.featureFinanceSubtitle")}</span></p></div>
            <div><Target size={20} aria-hidden="true" /><p><strong>{t("login.featureHabitsTitle")}</strong><span>{t("login.featureHabitsSubtitle")}</span></p></div>
          </div>
        </section>
        <form onSubmit={handleSubmit} className="login-form" aria-labelledby="login-heading" aria-busy={loading}>
          <div className="login-intro">
            <h1 id="login-heading">{mode === "signUp" ? t("login.createAccount") : t("login.welcomeBack")}</h1>
            <p>{mode === "signUp" ? t("login.createAccountSubtitle") : t("login.welcomeBackSubtitle")}</p>
          </div>
          <div role="tablist" aria-label="Account" className="login-tabs">
            {(["signIn", "signUp"] as const).map((item) => (
              <button key={item} id={`login-tab-${item}`} type="button" role="tab"
                aria-selected={mode === item} aria-controls="login-fields" tabIndex={mode === item ? 0 : -1}
                onClick={() => setMode(item)}
                onKeyDown={(event) => {
                  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    const next = event.key === "Home" ? "signIn" : event.key === "End" ? "signUp" : mode === "signIn" ? "signUp" : "signIn";
                    setMode(next);
                    document.getElementById(`login-tab-${next}`)?.focus();
                  }
                }}>
                {item === "signIn" ? t("settings.signIn") : t("settings.signUp")}
              </button>
            ))}
          </div>
          <div id="login-fields" role="tabpanel" aria-labelledby={`login-tab-${mode}`} className="login-fields">
        {mode === "signUp" && (
          <div className="login-name-fields">
            <FormField label={t("login.firstNameLabel")} htmlFor="login-first-name">
              <div className="relative">
                <input
                  id="login-first-name"
                  autoComplete="given-name"
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
                  autoComplete="family-name"
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
                aria-label="Country calling code"
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
              <div className="relative min-w-0 flex-1">
                <input
                  id="login-phone"
                  autoComplete="tel-national"
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
              autoComplete="email"
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
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
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

        {mode === "signIn" && <a href="/forgot-password" style={{ alignSelf: "flex-end", minHeight: 44, display: "inline-flex", alignItems: "center", color: "var(--login-accent)" }}>ลืมรหัสผ่าน?</a>}

        {needsEmailConfirmation && <p role="status" className="text-sm text-amber-400">{t("settings.confirmEmailSpamNote")}</p>}

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="login-submit"
        >
          {loading ? t("settings.processing") : mode === "signUp" ? t("settings.signUp") : t("settings.signIn")}
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
          </div>
        </form>
      </div>
      <footer className="login-footer" lang="en">Nexus All <span>One account. Your workspace.</span></footer>
    </main>
  );
}
