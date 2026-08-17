import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { vaultEntryRepository } from "./vaultEntryRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
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

describe("vaultEntryRepository", () => {
  beforeEach(async () => {
    await db.vaultEntries.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes an entry, fully encrypted when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await vaultEntryRepository.add(sample());

    let all = await vaultEntryRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Gmail", username: "me@example.com", password: "correct-horse-battery-staple" });

    // The raw row really is opaque -- not just title, but every business
    // field (including type, which some other table might have left
    // plaintext as an index key) is folded into encryptedContent.
    const rawRow = await db.vaultEntries.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.title).toBeUndefined();
    expect(rawRow?.type).toBeUndefined();
    expect(rawRow?.password).toBeUndefined();
    expect(rawRow?.syncId).toBeTruthy(); // plumbing field stays plaintext, as it must

    await vaultEntryRepository.update(id, sample({ password: "new-password" }));
    all = await vaultEntryRepository.getAll();
    expect(all[0].password).toBe("new-password");

    await vaultEntryRepository.remove(id);
    all = await vaultEntryRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await vaultEntryRepository.add(sample());
    const [before] = await vaultEntryRepository.getAll();

    await vaultEntryRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "vaultEntries", syncId: before.syncId });
  });

  // Documented honestly, not hidden: vaultEntryRepository is the same
  // generic createRepository every other table uses -- it has no
  // Vault-specific override, so calling it directly while encryption is off
  // still writes plaintext (see encryptedRepository.ts's isEncryptionEnabled
  // gate). The actual guarantee ("Vault entries are always encrypted") comes
  // from Vault.tsx blocking the whole page until encryptionEnabled is true,
  // not from this repository refusing to run. This test pins that reality so
  // it can't silently regress into being assumed otherwise.
  it("writes plaintext when called directly with encryption off -- the always-encrypted guarantee lives in the UI gate (Vault.tsx), not here", async () => {
    const id = await vaultEntryRepository.add(sample());

    const rawRow = await db.vaultEntries.get(id);
    expect(rawRow).not.toHaveProperty("encryptedContent");
    expect(rawRow?.title).toBe("Gmail");
  });
});
