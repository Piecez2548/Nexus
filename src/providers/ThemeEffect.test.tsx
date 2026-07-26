import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeEffect } from "./ThemeEffect";
import { useAppSettingsStore } from "@/store/appSettingsStore";

function setMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("ThemeEffect", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark", "mono");
    useAppSettingsStore.setState({ themeMode: "dark" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the dark class when themeMode is dark", () => {
    setMatchMedia(false);
    useAppSettingsStore.setState({ themeMode: "dark" });
    render(<ThemeEffect />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the dark class when themeMode is light", () => {
    document.documentElement.classList.add("dark");
    setMatchMedia(true);
    useAppSettingsStore.setState({ themeMode: "light" });
    render(<ThemeEffect />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("follows the OS preference when themeMode is system", () => {
    setMatchMedia(true);
    useAppSettingsStore.setState({ themeMode: "system" });
    render(<ThemeEffect />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("adds the mono class (and never dark) when themeMode is mono", () => {
    setMatchMedia(false);
    useAppSettingsStore.setState({ themeMode: "mono" });
    render(<ThemeEffect />);
    expect(document.documentElement.classList.contains("mono")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("removes a stale mono class when switching back to dark", () => {
    document.documentElement.classList.add("mono");
    setMatchMedia(false);
    useAppSettingsStore.setState({ themeMode: "dark" });
    render(<ThemeEffect />);
    expect(document.documentElement.classList.contains("mono")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
