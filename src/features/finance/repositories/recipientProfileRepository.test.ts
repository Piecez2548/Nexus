import { describe, expect, it, beforeEach } from "vitest";

import { db } from "@/database/db";
import { recipientProfileRepository } from "./recipientProfileRepository";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";
import type { RecipientProfile } from "@/features/finance/types";

function sample(overrides: Partial<RecipientProfile> = {}): RecipientProfile {
  return {
    recipientKey: "0812345678",
    alias: "Somchai",
    category: "Food",
    account: "Cash",
    transactionCount: 1,
    totalAmount: 100,
    lastUsedDate: "2026-07-21",
    confidenceScore: 1,
    ...overrides,
  };
}

describe("recipientProfileRepository.getByKey", () => {
  beforeEach(async () => {
    await db.recipientProfiles.clear();
    useAppLockStore.setState({ encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null });
    useEncryptionSessionStore.getState().clearDek();
  });

  it("finds a profile by its plaintext recipientKey when encryption is off", async () => {
    await recipientProfileRepository.add(sample());

    const found = await recipientProfileRepository.getByKey("0812345678");
    expect(found).toMatchObject({ recipientKey: "0812345678", alias: "Somchai", category: "Food" });
  });

  it("finds and fully decrypts a profile by its (still-plaintext) recipientKey when encryption is on", async () => {
    const dek = await generateDek();
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(dek);

    await recipientProfileRepository.add(sample());

    // The lookup key itself is never encrypted, so the where() query still
    // finds the row directly at the Dexie level...
    const rawRow = await db.recipientProfiles.where("recipientKey").equals("0812345678").first();
    expect(rawRow).toHaveProperty("encryptedContent");
    expect(rawRow?.alias).toBeUndefined(); // ...but its content is opaque until decrypted.

    // ...and the repository method returns it fully decrypted.
    const found = await recipientProfileRepository.getByKey("0812345678");
    expect(found).toMatchObject({ recipientKey: "0812345678", alias: "Somchai", category: "Food" });
  });

  it("returns undefined when no profile matches", async () => {
    const found = await recipientProfileRepository.getByKey("no-such-key");
    expect(found).toBeUndefined();
  });
});
