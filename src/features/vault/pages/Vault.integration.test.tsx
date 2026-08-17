import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Vault from "./Vault";
import { db } from "@/database/db";
import { useVaultEntryStore } from "@/features/vault/store/vaultEntryStore";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";

describe("Vault page", () => {
  beforeEach(async () => {
    await db.vaultEntries.clear();
    useVaultEntryStore.setState({ entries: [], loading: false, error: null });
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
    // jsdom has no Clipboard API at all -- define a stub rather than
    // spying on a real one that doesn't exist here.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("blocks the list behind an encryption-required gate when encryption is off", async () => {
    render(<Vault />);

    expect(await screen.findByText("Encryption required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add entry/i })).not.toBeInTheDocument();
  });

  describe("with encryption on", () => {
    beforeEach(async () => {
      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);
    });

    it("creates a new password entry and shows it in the list", async () => {
      const user = userEvent.setup();
      render(<Vault />);

      await user.click(screen.getByRole("button", { name: /add entry/i }));
      await user.type(await screen.findByLabelText("Title"), "Gmail");
      await user.type(screen.getByLabelText("Username / Email"), "me@example.com");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("Gmail")).toBeInTheDocument();
      expect(screen.getByText("me@example.com")).toBeInTheDocument();

      const rows = await db.vaultEntries.toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveProperty("encryptedContent");
    });

    it("creates a secure note", async () => {
      const user = userEvent.setup();
      render(<Vault />);

      await user.click(screen.getByRole("button", { name: /add entry/i }));
      await user.selectOptions(await screen.findByLabelText("Type"), "note");
      await user.type(screen.getByLabelText("Title"), "Wi-Fi password");
      await user.type(screen.getByLabelText("Note content"), "network: home, pass: hunter2");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("Wi-Fi password")).toBeInTheDocument();
      expect(screen.getByText("network: home, pass: hunter2")).toBeInTheDocument();
    });

    it("deletes an entry after confirming", async () => {
      await db.vaultEntries.add({
        type: "password",
        title: "Old Account",
        createdAt: "2026-08-17T00:00:00.000Z",
        syncId: "v-1",
        updatedAt: "2026-08-17T00:00:00.000Z",
      } as never);

      vi.spyOn(window, "confirm").mockReturnValue(true);
      const user = userEvent.setup();
      render(<Vault />);

      await user.click(await screen.findByRole("button", { name: "Delete Old Account" }));

      await waitFor(() => {
        expect(screen.getByText("No vault entries yet")).toBeInTheDocument();
      });
    });

    it("does not delete when the confirm dialog is dismissed", async () => {
      await db.vaultEntries.add({
        type: "password",
        title: "Keep Me",
        createdAt: "2026-08-17T00:00:00.000Z",
        syncId: "v-2",
        updatedAt: "2026-08-17T00:00:00.000Z",
      } as never);

      vi.spyOn(window, "confirm").mockReturnValue(false);
      const user = userEvent.setup();
      render(<Vault />);

      await user.click(await screen.findByRole("button", { name: "Delete Keep Me" }));

      expect(screen.getByText("Keep Me")).toBeInTheDocument();
      expect(await db.vaultEntries.count()).toBe(1);
    });

    it("filters the list by search text", async () => {
      await db.vaultEntries.bulkAdd([
        { type: "password", title: "Gmail", createdAt: "2026-08-17T00:00:00.000Z", syncId: "v-3", updatedAt: "2026-08-17T00:00:00.000Z" },
        { type: "note", title: "Alarm code", createdAt: "2026-08-17T00:00:00.000Z", syncId: "v-4", updatedAt: "2026-08-17T00:00:00.000Z" },
      ] as never[]);

      const user = userEvent.setup();
      render(<Vault />);

      await screen.findByText("Gmail");
      await user.type(screen.getByPlaceholderText("Search vault..."), "alarm");

      expect(screen.queryByText("Gmail")).not.toBeInTheDocument();
      expect(screen.getByText("Alarm code")).toBeInTheDocument();
    });
  });
});
