import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LanguageSettings from "./LanguageSettings";
import { useLanguageStore } from "@/store/languageStore";

describe("LanguageSettings", () => {
  it("switches the whole app's language when a language is chosen", async () => {
    const user = userEvent.setup();
    render(<LanguageSettings />);

    expect(useLanguageStore.getState().language).toBe("en");

    await user.click(screen.getByRole("button", { name: "ไทย" }));
    expect(useLanguageStore.getState().language).toBe("th");

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(useLanguageStore.getState().language).toBe("en");
  });

  it("marks the active language as pressed", async () => {
    const user = userEvent.setup();
    render(<LanguageSettings />);

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "ไทย" }));
    expect(screen.getByRole("button", { name: "ไทย" })).toHaveAttribute("aria-pressed", "true");
  });
});
