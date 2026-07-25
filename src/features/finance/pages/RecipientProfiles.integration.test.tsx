import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RecipientProfiles from "./RecipientProfiles";
import { db } from "@/database/db";
import { useRecipientProfileStore } from "@/features/finance/store/recipientProfileStore";

describe("RecipientProfiles page", () => {
  beforeEach(async () => {
    await db.recipientProfiles.clear();
    useRecipientProfileStore.setState({ profiles: [], loading: false, error: null });
  });

  it("shows an empty state with no learned profiles", async () => {
    render(<RecipientProfiles />);
    expect(await screen.findByText(/No learned data yet/)).toBeInTheDocument();
  });

  it("lists learned profiles with computed average and lets the user delete one", async () => {
    await db.recipientProfiles.add({
      recipientKey: "0812345678",
      alias: "ร้านก๋วยเตี๋ยวป้าแดง",
      category: "Food",
      transactionCount: 4,
      totalAmount: 232,
      lastUsedDate: "2026-07-20",
      confidenceScore: 80,
    });

    const user = userEvent.setup();
    render(<RecipientProfiles />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("ร้านก๋วยเตี๋ยวป้าแดง")).toBeInTheDocument();
    expect(within(table).getByText("฿58")).toBeInTheDocument(); // 232 / 4
    expect(within(table).getByText("80%")).toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.queryByText("ร้านก๋วยเตี๋ยวป้าแดง")).not.toBeInTheDocument();
    });
    expect(await db.recipientProfiles.toArray()).toHaveLength(0);
  });
});
