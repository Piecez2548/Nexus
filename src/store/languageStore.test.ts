import { describe, expect, it, beforeEach } from "vitest";
import { useLanguageStore } from "./languageStore";

describe("languageStore", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "th" });
  });

  it("defaults to Thai", () => {
    expect(useLanguageStore.getState().language).toBe("th");
  });

  it("switches to English", () => {
    useLanguageStore.getState().setLanguage("en");
    expect(useLanguageStore.getState().language).toBe("en");
  });
});
