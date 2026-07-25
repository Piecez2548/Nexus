import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { useLanguageStore } from "@/store/languageStore";

// The app defaults to Thai, but every existing test asserts on English UI
// text — force English globally so the i18n migration doesn't require
// rewriting hundreds of existing assertions. Tests that specifically
// exercise the language toggle set their own state.
beforeEach(() => {
  useLanguageStore.setState({ language: "en" });
});

afterEach(() => {
  cleanup();
});
