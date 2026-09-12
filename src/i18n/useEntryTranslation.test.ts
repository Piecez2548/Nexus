import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useLanguageStore } from "@/store/languageStore";
import { useEntryTranslation } from "./useEntryTranslation";
import { translate } from "./useTranslation";

it("keeps entry translations and interpolation in sync when the locale changes", () => {
  useLanguageStore.setState({ language: "en" });
  const { result } = renderHook(() => useEntryTranslation());
  for (const language of ["en", "th"] as const) {
    act(() => useLanguageStore.getState().setLanguage(language));
    expect(result.current.language).toBe(language);
    for (const key of ["common.retry", "login.welcomeBack", "settings.signIn", "lock.emailLabel", "mfa.challengeTitle", "login.verifyEmailSubtitle"]) {
      const value = result.current.t(key, { email: "test@example.com" });
      expect(value).not.toBe(key);
      expect(value).toBe(translate(key, { email: "test@example.com" }));
    }
  }
  expect(result.current.t("missing.key")).toBe("missing.key");
});
