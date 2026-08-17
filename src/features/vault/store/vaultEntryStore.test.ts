import { describe, expect, it, beforeEach } from "vitest";
import { useVaultEntryStore } from "./vaultEntryStore";
import { db } from "@/database/db";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import { clearAuditLog, getAuditLog } from "@/features/security/auditLog";
import type { VaultEntry } from "@/features/vault/types";

function sample(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    type: "password",
    title: "Gmail",
    username: "me@example.com",
    password: "correct-horse-battery-staple",
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("vaultEntryStore", () => {
  beforeEach(async () => {
    await db.vaultEntries.clear();
    useVaultEntryStore.setState({ entries: [], loading: false, error: null });
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);
    clearAuditLog();
  });

  it("loadEntries populates state from the repository", async () => {
    await db.vaultEntries.add({ ...sample(), syncId: "v-1", updatedAt: "2026-08-17T00:00:00.000Z" } as never);

    await useVaultEntryStore.getState().loadEntries();

    expect(useVaultEntryStore.getState().entries).toHaveLength(1);
  });

  it("addEntry persists and refreshes state, recording an audit event with the type but never the secret content", async () => {
    await useVaultEntryStore.getState().addEntry(sample());

    expect(useVaultEntryStore.getState().entries).toHaveLength(1);
    expect(useVaultEntryStore.getState().entries[0]).toMatchObject({ title: "Gmail" });

    const events = getAuditLog().filter((e) => e.type === "vault");
    expect(events).toEqual([expect.objectContaining({ action: "created", detail: { entryType: "password" } })]);
    expect(JSON.stringify(events)).not.toContain("Gmail");
    expect(JSON.stringify(events)).not.toContain("correct-horse-battery-staple");
  });

  it("updateEntry persists a change and refreshes state", async () => {
    await useVaultEntryStore.getState().addEntry(sample());
    const [entry] = useVaultEntryStore.getState().entries;
    clearAuditLog();

    await useVaultEntryStore.getState().updateEntry(entry.id!, { ...entry, title: "Gmail (personal)" });

    expect(useVaultEntryStore.getState().entries[0].title).toBe("Gmail (personal)");
    expect(getAuditLog()).toEqual([expect.objectContaining({ type: "vault", action: "updated" })]);
  });

  it("deleteEntry removes the entry and refreshes state", async () => {
    await useVaultEntryStore.getState().addEntry(sample());
    const [entry] = useVaultEntryStore.getState().entries;
    clearAuditLog();

    await useVaultEntryStore.getState().deleteEntry(entry.id!);

    expect(useVaultEntryStore.getState().entries).toHaveLength(0);
    expect(getAuditLog()).toEqual([expect.objectContaining({ type: "vault", action: "deleted" })]);
  });
});
