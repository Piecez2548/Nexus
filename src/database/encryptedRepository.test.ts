import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { createEncryptedRepository, EncryptionLockedError } from "@/database/encryptedRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { Transaction } from "@/features/finance/types";

const repo = createEncryptedRepository<Transaction>(db.transactions, {
  plaintextKeys: ["account"], // arbitrary, real fixture just to exercise the plaintextKeys path
});

// A factory, not a shared const — Dexie's `table.add()` mutates its input
// object by stamping the generated `id` back onto it, so reusing one object
// literal across tests/calls would leak an `id` from an earlier `.add()`
// into a later one and collide on the primary key.
function sample(overrides: Partial<Transaction> = {}): Transaction {
  return {
    title: "Coffee",
    amount: 120,
    type: "expense",
    category: "Food",
    account: "Cash",
    date: "2026-07-21",
    status: "completed",
    syncId: "tx-1",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("encryptedRepository", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("is a byte-identical passthrough when encryption has never been enabled", async () => {
    const id = await repo.add(sample());
    const rows = await repo.getAll();

    expect(rows).toEqual([sample({ id })]);

    const rawRow = await db.transactions.get(id);
    expect(rawRow).toEqual(sample({ id }));
    // Confirms nothing was folded into an encrypted envelope.
    expect(rawRow).not.toHaveProperty("encryptedContent");
  });

  it("encrypts on write and decrypts on read when encryption is enabled", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await repo.add(sample());

    const rawRow = await db.transactions.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.title).toBeUndefined(); // folded into the envelope, not a plaintext column
    expect(rawRow?.syncId).toBe("tx-1"); // plumbing field stays plaintext
    expect(rawRow?.account).toBe("Cash"); // explicitly exempted plaintextKeys field stays plaintext

    const rows = await repo.getAll();
    expect(rows).toEqual([sample({ id })]);
  });

  it("updates a row in place, still encrypted, preserving id and syncId", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await repo.add(sample());
    await repo.update(id, sample({ amount: 200 }));

    const rows = await repo.getAll();
    expect(rows).toEqual([sample({ id, amount: 200 })]);
  });

  it("tolerates a table with both legacy plaintext rows and newly-encrypted rows", async () => {
    // A legacy row written before encryption was ever turned on.
    const legacyId = await db.transactions.add(sample({ syncId: "tx-legacy" }));

    // A row written after encryption was enabled.
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);
    const newId = await repo.add(sample({ syncId: "tx-new", title: "Salary", amount: 30000 }));

    const rows = await repo.getAll();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === legacyId)).toEqual(sample({ id: legacyId, syncId: "tx-legacy" }));
    expect(rows.find((r) => r.id === newId)).toEqual(
      sample({ id: newId, syncId: "tx-new", title: "Salary", amount: 30000 })
    );
  });

  it("throws EncryptionLockedError when encryption is enabled but no session DEK is resident", async () => {
    useAppLockStore.setState({ encryptionEnabled: true });
    // Deliberately not setting a session DEK — simulates a locked app.

    await expect(repo.add(sample())).rejects.toThrow(EncryptionLockedError);
    await expect(repo.getAll()).rejects.toThrow(EncryptionLockedError);
  });

  it("throws EncryptionLockedError for a row synced down from another device, even though this device's own encryptionEnabled flag is still false", async () => {
    // This device has never run the enable/recovery flow locally, but the
    // account's data is already encrypted elsewhere — syncEngine.ts pulls
    // remote rows down opaquely, so an encrypted-shaped row can land here
    // regardless of the local flag. Reading it must fail loudly (and
    // distinctly), never silently return a row missing all its fields.
    await db.transactions.add({
      syncId: "tx-from-other-device",
      updatedAt: "2026-07-25T00:00:00.000Z",
      encryptedContent: { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0" },
    } as never);

    expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
    await expect(repo.getAll()).rejects.toThrow(EncryptionLockedError);
  });

  it("decrypts a row synced from another device once a session DEK becomes resident, even before the local encryptionEnabled flag flips true", async () => {
    // Mirrors the moment right after completeRecovery unwraps the DEK but
    // before its own `set({ encryptionEnabled: true })` call — decryption
    // must key off the row's own shape, not only the local flag.
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);
    const id = await repo.add(sample({ syncId: "tx-from-other-device" }));

    useAppLockStore.setState({ encryptionEnabled: false }); // simulates catch-up ordering
    const rows = await repo.getAll();

    expect(rows).toEqual([sample({ id, syncId: "tx-from-other-device" })]);
  });

  describe("update", () => {
    // Regression: update() only ever checked the local encryptionEnabled
    // flag, unlike getAll()/decryptOptional() which also check the row's
    // own shape. A row synced down already-encrypted from another device,
    // updated on this device before it's ever run enable/recovery locally,
    // would silently downgrade to plaintext -- table.put() writing the
    // plain fields straight over the existing encryptedContent.
    it("keeps re-encrypting a row synced from another device, even though this device's own encryptionEnabled flag is still false", async () => {
      const id = await db.transactions.add({
        syncId: "tx-from-other-device",
        updatedAt: "2026-07-25T00:00:00.000Z",
        encryptedContent: { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0" },
      } as never);

      expect(useAppLockStore.getState().encryptionEnabled).toBe(false);
      await expect(repo.update(id, sample({ id }))).rejects.toThrow(EncryptionLockedError);

      // Must not have been silently downgraded to plaintext by a table.put()
      // that ran before the throw -- the original encrypted row survives.
      const stored = await db.transactions.get(id);
      expect(stored).toHaveProperty("encryptedContent");
      expect((stored as unknown as { title?: string }).title).toBeUndefined();
    });

    it("stays a plain put() for a genuinely plaintext row when encryption is disabled", async () => {
      const id = await repo.add(sample());

      await repo.update(id, sample({ id, title: "Updated" }));

      const stored = await db.transactions.get(id);
      expect(stored).not.toHaveProperty("encryptedContent");
      expect((stored as unknown as { title: string }).title).toBe("Updated");
    });
  });

  describe("decryptOptional", () => {
    it("passes a plaintext row through unchanged when encryption is disabled", async () => {
      const id = await repo.add(sample());
      const row = await db.transactions.get(id);

      const result = await repo.decryptOptional(row);
      expect(result).toEqual(sample({ id }));
    });

    it("decrypts a single row fetched via a direct Dexie query (e.g. a .where() lookup)", async () => {
      const dek = await generateDek();
      useAppLockStore.setState({ encryptionEnabled: true });
      useEncryptionSessionStore.getState().setDek(dek);

      const id = await repo.add(sample());
      // Simulates recipientProfileRepository.getByKey's pattern: querying
      // the Dexie table directly by a plaintext-exempt field, bypassing
      // getAll entirely.
      const rawRow = await db.transactions.get(id);

      const result = await repo.decryptOptional(rawRow);
      expect(result).toEqual(sample({ id }));
    });

    it("passes undefined through when no row was found", async () => {
      const result = await repo.decryptOptional(undefined);
      expect(result).toBeUndefined();
    });

    it("throws EncryptionLockedError for an encrypted-shaped row even when the local encryptionEnabled flag is false", async () => {
      const row = {
        syncId: "tx-from-other-device",
        updatedAt: "2026-07-25T00:00:00.000Z",
        encryptedContent: { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0" },
      } as unknown as Transaction;

      await expect(repo.decryptOptional(row)).rejects.toThrow(EncryptionLockedError);
    });
  });
});
