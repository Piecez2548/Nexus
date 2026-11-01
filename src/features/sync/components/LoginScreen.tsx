import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowUpRight, Check, Eye, EyeOff, Loader2, Lock, LockOpen, Target, Wallet, X, ArrowBigUp } from "lucide-react";

import { useAuthStore } from "@/features/sync/store/authStore";
import { useEntryTranslation } from "@/i18n/useEntryTranslation";
import { EMAIL_PATTERN, passwordScore, signInProgress, signUpProgress } from "./loginProgress";
import "./loginScreen.css";

// Not exhaustive -- a small, hand-picked list rather than a full phone-number
// library (none is installed anywhere in this codebase). +66 first since
// Thai is this app's primary audience.
const COUNTRY_CODES = ["+66", "+1", "+44", "+65", "+81", "+82", "+86"];
const RING_LENGTH = 320.44;

function fieldClassName(touched: boolean, valid: boolean): string {
  return `login-input${touched ? (valid ? " is-valid" : " is-invalid") : ""}`;
}

function ValidationBadge({ touched, valid }: { touched: boolean; valid: boolean }) {
  if (!touched) return null;
  return (
    <span className={`login-badge ${valid ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
      {valid ? <Check size={14} /> : <X size={14} />}
    </span>
  );
}

// Pointer effects are decoration only: skipped for touch and reduced motion.
function mediaMatches(query: string) {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function pointerEffectsAllowed() {
  return mediaMatches("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
}

export default function LoginScreen() {
  const { loading, error, needsEmailConfirmation, signUp, signIn } = useAuthStore();
  const signedIn = useAuthStore((state) => state.user !== null);
  const { t } = useEntryTranslation();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const emailValid = EMAIL_PATTERN.test(email);
  const passwordValid = password.length >= 6;
  const firstNameValid = firstName.trim().length > 0;
  const lastNameValid = lastName.trim().length > 0;
  const phoneValid = phone.trim().length >= 6;

  const isSignUp = mode === "signUp";
  const progress = isSignUp ? signUpProgress(firstName, lastName, email, password) : signInProgress(email, password);
  const ready = progress >= 1;
  // Success mirrors the real store outcome; the route gate moves on right after.
  const done = submitted && !loading && !error && signedIn;
  const status: "idle" | "loading" | "done" = loading ? "loading" : done ? "done" : "idle";
  const score = passwordScore(password);
  const strengthLabels = [t("login.strengthHint"), t("login.strengthWeak"), t("login.strengthFair"), t("login.strengthGood"), t("login.strengthStrong")];

  // A short shake each time a new error arrives.
  useEffect(() => {
    if (!error || typeof card.current?.animate !== "function" || mediaMatches("(prefers-reduced-motion: reduce)")) return;
    card.current!.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }],
      { duration: 380, easing: "ease-out" },
    );
  }, [error]);

  function pick(next: "signIn" | "signUp") {
    if (next === mode) return;
    setMode(next);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setCountryCode(COUNTRY_CODES[0]);
    setPhone("");
    setTouched({});
    setShowPassword(false);
    setCapsLock(false);
    setSubmitted(false);
    useAuthStore.setState({ error: null, needsEmailConfirmation: false });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setSubmitted(true);

    if (mode === "signUp") {
      await signUp(email, password, { firstName, lastName, phone: `${countryCode}${phone}` });
    } else {
      await signIn(email, password);
    }
  }

  function trackCaps(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  function tilt(event: MouseEvent<HTMLDivElement>) {
    if (!pointerEffectsAllowed()) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.setProperty("--ry", `${(px * 5).toFixed(2)}deg`);
    element.style.setProperty("--rx", `${(-py * 5).toFixed(2)}deg`);
    element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    element.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  function untilt(event: MouseEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--rx", "0deg");
    event.currentTarget.style.setProperty("--ry", "0deg");
  }

  function pageGlow(event: MouseEvent<HTMLElement>) {
    if (!pointerEffectsAllowed()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--gx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--gy", `${event.clientY - rect.top}px`);
  }

  const heading = done
    ? (isSignUp ? t("login.accountCreatedTitle") : t("login.signedInTitle"))
    : (isSignUp ? t("login.createAccount") : t("login.welcomeBack"));
  const subheading = done ? t("login.redirecting") : (isSignUp ? t("login.createAccountSubtitle") : t("login.welcomeBackSubtitle"));
  const submitLabel = isSignUp ? t("settings.signUp") : t("settings.signIn");

  const passwordField = (
    <div className="login-row">
      <label htmlFor="login-password">{t("settings.passwordLabel")}</label>
      <div className="login-field">
        <input
          id="login-password"
          className={`${fieldClassName(Boolean(touched.password), passwordValid)} has-eye`}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          type={showPassword ? "text" : "password"}
          required
          minLength={6}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => markTouched("password")}
          onKeyDown={trackCaps}
          onKeyUp={trackCaps}
        />
        <button
          type="button"
          className="login-eye"
          aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
      {isSignUp && (
        <>
          <div className="login-strength" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => <span key={n} className={score >= n ? "on" : ""} />)}
          </div>
          <p className="login-hint" aria-live="polite">{strengthLabels[score]}</p>
        </>
      )}
      {capsLock && <p role="status" className="login-caps"><ArrowBigUp size={14} aria-hidden="true" />{t("login.capsLockOn")}</p>}
    </div>
  );

  return (
    <main className="login-page dark" onMouseMove={pageGlow}>
      <div className="login-glow-page" aria-hidden="true" />
      <div className="login-orbits" aria-hidden="true">
        <div className="orb-center">
          <i className="orb-ring orb-1500" />
          <i className="orb-ring orb-1100 dashed" />
          <i className="orb-ring orb-800" />
          <i className="orb-spin orb-800 reverse"><span className="sat-lavender" /></i>
          <i className="orb-spin orb-1100"><span className="sat-ivory" /></i>
          <i className="orb-core" />
        </div>
      </div>
      <div className="login-shell">
        <header className="login-header">
          <div className="login-brand" aria-label="Nexus">
            <span className="login-mark" aria-hidden="true">N</span>
            <span className="login-name">nexus<span>.</span></span>
          </div>
          <div className="login-header-end">
            <span className="login-private" lang="en"><i aria-hidden="true" />Private</span>
            <a className="login-back" href="/projects" lang="en">Nexus All</a>
          </div>
        </header>

        <div className="login-main">
          <div className="login-hero">
            <div className="login-seal" aria-hidden="true">
              <svg width="108" height="108" viewBox="0 0 108 108">
                <circle cx="54" cy="54" r="51" fill="none" className="seal-track" strokeWidth="2" />
                <circle cx="54" cy="54" r="51" fill="none" className={`seal-ring${ready ? " full" : ""}`} strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={RING_LENGTH} strokeDashoffset={RING_LENGTH * (1 - Math.min(1, progress))} />
              </svg>
              <span className="seal-orbit"><i /></span>
              {done && <><span className="seal-burst" /><span className="seal-burst b2" /><span className="seal-burst b3" /></>}
              <span className="seal-core"><span lang="en">N</span></span>
              <span className={`seal-badge${ready ? " ok" : ""}`}>{ready ? <LockOpen size={15} /> : <Lock size={15} />}</span>
            </div>
            <p className="login-eyebrow" lang="en"><i aria-hidden="true" />Private workspace<i aria-hidden="true" /></p>
            <h1 lang="en">Your Nexus <em>workspace.</em></h1>
            <p className="login-tagline">{t("login.tagline")}</p>
          </div>

          <section className="login-card-wrap" aria-label="Nexus">
            <div className="login-card" ref={card} onMouseMove={tilt} onMouseLeave={untilt}>
              <div className="login-card-body">
                <div className="login-card-glow" aria-hidden="true" />
                <form onSubmit={handleSubmit} className="login-form" aria-labelledby="login-heading" aria-busy={loading}>
                  <div className="login-intro">
                    <h2 id="login-heading" aria-live="polite">{heading}</h2>
                    <p>{subheading}</p>
                  </div>
                  <div role="tablist" aria-label="Account" className="login-tabs">
                    <span aria-hidden="true" className={`login-pill${isSignUp ? " signup" : ""}`} />
                    {(["signIn", "signUp"] as const).map((item) => (
                      <button key={item} id={`login-tab-${item}`} type="button" role="tab"
                        aria-selected={mode === item} aria-controls="login-fields" tabIndex={mode === item ? 0 : -1}
                        onClick={() => pick(item)}
                        onKeyDown={(event) => {
                          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                            event.preventDefault();
                            const next = event.key === "Home" ? "signIn" : event.key === "End" ? "signUp" : mode === "signIn" ? "signUp" : "signIn";
                            pick(next);
                            document.getElementById(`login-tab-${next}`)?.focus();
                          }
                        }}>
                        {item === "signIn" ? t("settings.signIn") : t("settings.signUp")}
                      </button>
                    ))}
                  </div>
                  <div id="login-fields" role="tabpanel" aria-labelledby={`login-tab-${mode}`} className="login-fields" key={mode}>
                    {isSignUp && (
                      <div className="login-name-fields login-rise" style={{ animationDelay: "0.02s" }}>
                        <div className="login-row">
                          <label htmlFor="login-first-name">{t("login.firstNameLabel")}</label>
                          <div className="login-field">
                            <input id="login-first-name" className={fieldClassName(Boolean(touched.firstName), firstNameValid)} autoComplete="given-name" type="text" required
                              value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => markTouched("firstName")} />
                            <ValidationBadge touched={Boolean(touched.firstName)} valid={firstNameValid} />
                          </div>
                        </div>
                        <div className="login-row">
                          <label htmlFor="login-last-name">{t("login.lastNameLabel")}</label>
                          <div className="login-field">
                            <input id="login-last-name" className={fieldClassName(Boolean(touched.lastName), lastNameValid)} autoComplete="family-name" type="text" required
                              value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => markTouched("lastName")} />
                            <ValidationBadge touched={Boolean(touched.lastName)} valid={lastNameValid} />
                          </div>
                        </div>
                      </div>
                    )}

                    {isSignUp && (
                      <div className="login-row login-rise" style={{ animationDelay: "0.06s" }}>
                        <label htmlFor="login-phone">{t("login.phoneLabel")}</label>
                        <div className="login-phone">
                          <select aria-label="Country calling code" className="login-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                            {COUNTRY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
                          </select>
                          <div className="login-field">
                            <input id="login-phone" className={fieldClassName(Boolean(touched.phone), phoneValid)} autoComplete="tel-national" type="tel" required
                              value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => markTouched("phone")} />
                            <ValidationBadge touched={Boolean(touched.phone)} valid={phoneValid} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="login-row login-rise" style={{ animationDelay: "0.1s" }}>
                      <label htmlFor="login-email">{t("lock.emailLabel")}</label>
                      <div className="login-field">
                        <input id="login-email" className={fieldClassName(Boolean(touched.email), emailValid)} autoComplete="email" type="email" required placeholder="you@example.com"
                          value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => markTouched("email")} />
                        <ValidationBadge touched={Boolean(touched.email)} valid={emailValid} />
                      </div>
                    </div>

                    <div className="login-rise" style={{ animationDelay: "0.16s" }}>{passwordField}</div>

                    {!isSignUp && <a className="login-forgot" href="/forgot-password">ลืมรหัสผ่าน?</a>}

                    {needsEmailConfirmation && <p role="status" className="login-notice">{t("settings.confirmEmailSpamNote")}</p>}

                    {error && <p role="alert" className="login-error">{error}</p>}

                    <button type="submit" disabled={loading || done} className={`login-submit${done ? " done" : ready && !loading ? " ready" : ""}`}>
                      {status === "loading" ? (
                        <><Loader2 className="login-spin" size={18} aria-hidden="true" />{isSignUp ? t("login.creatingAccount") : t("login.verifying")}</>
                      ) : status === "done" ? (
                        <><Check size={20} aria-hidden="true" />{t("login.success")}</>
                      ) : (
                        <>{submitLabel}<ArrowUpRight size={18} aria-hidden="true" /></>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="login-features">
              <span><Wallet size={18} aria-hidden="true" />{t("login.featureFinanceTitle")} · {t("login.featureFinanceSubtitle")}</span>
              <span><Target size={18} aria-hidden="true" />{t("login.featureHabitsTitle")} · {t("login.featureHabitsSubtitle")}</span>
            </div>
          </section>
        </div>

        <footer className="login-footer" lang="en">© 2026 Nexus · Private workspace hub</footer>
      </div>
    </main>
  );
}
