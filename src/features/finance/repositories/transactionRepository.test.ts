import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { transactionRepository } from "./transactionRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { Transaction } from "@/features/finance/types";

// Pins the invariant that routing transactionRepository through
// encryptedRepository (see createEncryptedRepository in
// src/database/encryptedRepository.ts) is invisible to callers — the same
// add/update/remove/getAll contract holds whether or not encryption is
// enabled on this install.
function sample(overrides: Partial<Transaction> = {}): Transaction {
  return {
    title: "Coffee",
    amount: 120,
    type: "expense",
    category: "Food",
    account: "Cash",
    date: "2026-07-21",
    status: "completed",
    ...overrides,
  };
}

describe("transactionRepository", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.syncTombstones.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("adds, lists, updates, and removes a transaction when encryption is off", async () => {
    const id = await transactionRepository.add(sample());

    let all = await transactionRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Coffee", amount: 120 });

    await transactionRepository.update(id, sample({ amount: 200 }));
    all = await transactionRepository.getAll();
    expect(all[0].amount).toBe(200);

    await transactionRepository.remove(id);
    all = await transactionRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("adds, lists, updates, and removes a transaction identically when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await transactionRepository.add(sample());

    let all = await transactionRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: "Coffee", amount: 120 });

    await transactionRepository.update(id, sample({ amount: 200 }));
    all = await transactionRepository.getAll();
    expect(all[0].amount).toBe(200);

    // The underlying row really is encrypted, not just passed through.
    const rawRow = await db.transactions.get(id);
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.title).toBeUndefined();

    await transactionRepository.remove(id);
    all = await transactionRepository.getAll();
    expect(all).toHaveLength(0);
  });

  it("records a tombstone with the syncId on remove, even when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    const id = await transactionRepository.add(sample());
    const [before] = await transactionRepository.getAll();

    await transactionRepository.remove(id);

    const tombstones = await db.syncTombstones.toArray();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ table: "transactions", syncId: before.syncId });
  });
});
