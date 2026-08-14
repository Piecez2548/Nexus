import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/database/db";
import { useLanguageStore } from "@/store/languageStore";

import ImportHistorySettings from "./ImportHistorySettings";

beforeEach(async () => {
  useLanguageStore.setState({ language: "en" });
  await db.slipImportHistory.clear();
});

describe("ImportHistorySettings", () => {
  it("opens the Import History drawer from the settings tile", async () => {
    const user = userEvent.setup();
    render(<ImportHistorySettings />);

    expect(screen.queryByText("A log of every slip import batch on this device.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Slip Import History" }));

    await waitFor(() =>
      expect(screen.getByText("A log of every slip import batch on this device.")).toBeInTheDocument(),
    );
  });
});
