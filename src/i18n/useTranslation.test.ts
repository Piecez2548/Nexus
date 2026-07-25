import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useTranslation } from "./useTranslation";
import { useLanguageStore } from "@/store/languageStore";

describe("useTranslation", () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: "en" });
  });

  it("resolves a nested key in English", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("common.edit")).toBe("Edit");
  });

  it("resolves the same key in Thai after switching language", () => {
    useLanguageStore.setState({ language: "th" });
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("common.edit")).toBe("แก้ไข");
  });

  it("interpolates params into the template", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("common.editName", { name: "Coffee" })).toBe("Edit Coffee");
  });

  it("falls back to the raw key when it doesn't resolve to a string", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t("this.key.does.not.exist")).toBe("this.key.does.not.exist");
  });
});
